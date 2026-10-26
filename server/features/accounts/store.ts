import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, fchmodSync, openSync, closeSync, constants } from 'node:fs';
import path from 'node:path';
import { localDatabasePath, assertCreatedDatabasePath } from './config';

const scrypt = promisify(scryptCallback);
const CURRENT_SCHEMA_VERSION = 2;
const RESET_WINDOW_MS = 15 * 60 * 1000;
const RESET_IP_LIMIT = 10;
const RESET_GLOBAL_LIMIT = 120;
const RESET_TARGET_SCHOOL = 'al-horua';
const RESET_TARGET_USERNAME = 'walud';
export type Role = 'school_admin' | 'teacher' | 'student';
export interface Member { id: string; username: string; displayName: string; role: Role }
interface UserRow extends Member { school_id: string; password_hash: string }
export class AccountError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
export function hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
export function csrfFor(token: string) { return hashToken(`noon-csrf:${token}`); }
function hasSingleColumnUniqueKey(db: DatabaseSync, table: 'password_reset_tokens' | 'password_reset_rate_limits', column: string) {
  const indexes = db.prepare(`PRAGMA index_list(${table})`).all() as Array<{ name: string; unique: number; partial: number }>;
  for (const index of indexes) {
    if (index.unique !== 1 || index.partial !== 0) continue;
    const quotedName = `"${index.name.replace(/"/g, '""')}"`;
    const indexedColumns = db.prepare(`PRAGMA index_info(${quotedName})`).all() as Array<{ cid: number; name: string | null }>;
    if (indexedColumns.length === 1 && indexedColumns[0].cid >= 0 && indexedColumns[0].name === column) return true;
  }
  const primaryKey = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string; pk: number }>;
  const primaryKeyColumns = primaryKey.filter(value => value.pk > 0);
  return primaryKeyColumns.length === 1 && primaryKeyColumns[0].name === column;
}
function text(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.length >= min && value.length <= max;
}
export function isStrongResetSecret(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) return false;
  const decoded = Buffer.from(value, 'base64url');
  return decoded.length === 32 && decoded.toString('base64url') === value;
}
export function validateCredentials(input: unknown, provisioning = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AccountError('invalid_input');
  const value = input as Record<string, unknown>;
  const allowed = provisioning ? ['username', 'password', 'displayName', 'role'] : ['schoolSlug', 'username', 'password'];
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new AccountError('invalid_input');
  if (!text(value.username, 3, 64) || !/^[a-z0-9][a-z0-9._-]*$/.test(value.username) || !text(value.password, provisioning ? 12 : 1, 128)) throw new AccountError('invalid_input');
  if (provisioning && (!text(value.displayName, 1, 100) || !value.displayName.trim() || !['teacher', 'student'].includes(String(value.role)))) throw new AccountError('invalid_input');
  if (!provisioning && (!text(value.schoolSlug, 3, 64) || !/^[a-z0-9][a-z0-9-]*$/.test(value.schoolSlug))) throw new AccountError('invalid_input');
  return value;
}
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString('hex')}`;
}
async function verify(password: string, encoded: string) {
  const [, salt, expected] = encoded.split(':');
  const actual = await scrypt(password, salt, 64) as Buffer;
  const buffer = Buffer.from(expected, 'hex');
  return buffer.length === actual.length && timingSafeEqual(buffer, actual);
}
const DUMMY_HASH = `scrypt:00000000000000000000000000000000:${'00'.repeat(64)}`;
function member(row: UserRow): Member { return { id: row.id, username: row.username, displayName: row.displayName, role: row.role }; }

/** Local SQLite repository. Accounts belong to exactly one school in this slice. */
export class AccountStore {
  readonly db: DatabaseSync;
  constructor(filename: string, applicationRoot?: string) {
    if (applicationRoot) localDatabasePath(filename, applicationRoot);
    if (filename !== ':memory:') {
      mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
      const fd = openSync(filename, constants.O_RDWR | constants.O_CREAT | constants.O_NOFOLLOW, 0o600);
      try { fchmodSync(fd, 0o600); } finally { closeSync(fd); }
      if (applicationRoot) assertCreatedDatabasePath(filename, applicationRoot);
    }
    this.db = new DatabaseSync(filename);
    if (applicationRoot) {
      try { assertCreatedDatabasePath(filename, applicationRoot); }
      catch (error) { this.db.close(); throw error; }
    }
    let transaction = false;
    try {
      this.db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; BEGIN IMMEDIATE');
      transaction = true;
      const version = Number((this.db.prepare('PRAGMA user_version').get() as {user_version:number}).user_version);
      if (![0, 1, CURRENT_SCHEMA_VERSION].includes(version)) throw new AccountError('unsupported_schema_version', 500);
      if (version === 0 && this.db.prepare("SELECT 1 FROM sqlite_schema WHERE name NOT GLOB 'sqlite_*' LIMIT 1").get()) throw new AccountError('unversioned_schema_requires_migration', 500);
      if (version >= 1) {
        // Compatibility guard: only known core shapes are eligible for this additive migration.
        try {
          this.db.prepare('SELECT id,slug,name FROM schools LIMIT 0').all();
          this.db.prepare('SELECT id,school_id,username,display_name,password_hash,role FROM users LIMIT 0').all();
          this.db.prepare('SELECT token_hash,user_id,expires_at FROM sessions LIMIT 0').all();
        } catch { throw new AccountError('unsupported_schema_shape', 500); }
      }
      if (version === 1 && this.db.prepare("SELECT 1 FROM sqlite_schema WHERE name IN ('password_reset_tokens','password_reset_rate_limits') LIMIT 1").get()) {
        throw new AccountError('unsupported_schema_shape', 500);
      }
      if (version === CURRENT_SCHEMA_VERSION) {
        let resetKeysValid = false;
        try {
          this.db.prepare('SELECT token_hash,consumed_at FROM password_reset_tokens LIMIT 0').all();
          this.db.prepare('SELECT scope_hash,window_started_at,attempts FROM password_reset_rate_limits LIMIT 0').all();
          resetKeysValid = hasSingleColumnUniqueKey(this.db, 'password_reset_tokens', 'token_hash') &&
            hasSingleColumnUniqueKey(this.db, 'password_reset_rate_limits', 'scope_hash');
        } catch { throw new AccountError('unsupported_schema_shape', 500); }
        if (!resetKeysValid) throw new AccountError('unsupported_schema_shape', 500);
      }
      if (version === 0) this.db.exec(`
        CREATE TABLE schools (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL);
        CREATE TABLE users (
          id TEXT PRIMARY KEY, school_id TEXT NOT NULL REFERENCES schools(id),
          username TEXT NOT NULL, display_name TEXT NOT NULL, password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('school_admin','teacher','student')),
          UNIQUE(school_id, username)
        );
        CREATE TABLE sessions (
          token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at INTEGER NOT NULL
        );
        PRAGMA user_version = 1;`);
      if (version < CURRENT_SCHEMA_VERSION) this.db.exec(`
        CREATE TABLE password_reset_tokens (
          token_hash TEXT PRIMARY KEY, consumed_at INTEGER NOT NULL
        ) WITHOUT ROWID;
        CREATE TABLE password_reset_rate_limits (
          scope_hash TEXT PRIMARY KEY, window_started_at INTEGER NOT NULL,
          attempts INTEGER NOT NULL CHECK (attempts > 0)
        ) WITHOUT ROWID;
        PRAGMA user_version = ${CURRENT_SCHEMA_VERSION};`);
      this.db.exec('COMMIT');
      transaction = false;
    } catch (error) {
      try { if (transaction) this.db.exec('ROLLBACK'); } finally { this.db.close(); }
      throw error;
    }
  }
  close() { this.db.close(); }
  private immediate<T>(operation: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      try { this.db.exec('ROLLBACK'); } catch { /* preserve the original error */ }
      throw error;
    }
  }
  async bootstrapSchool(slug: string, name: string, username: string, password: string, displayName: string) {
    validateCredentials({ schoolSlug: slug, username, password });
    if (!text(password, 12, 128) || !text(name, 1, 100) || !name.trim() || !text(displayName, 1, 100) || !displayName.trim()) throw new AccountError('invalid_input');
    const encoded = await passwordHash(password);
    const schoolId = randomUUID(), userId = randomUUID();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('INSERT INTO schools (id,slug,name) VALUES (?,?,?)').run(schoolId, slug, name);
      this.db.prepare('INSERT INTO users (id,school_id,username,display_name,password_hash,role) VALUES (?,?,?,?,?,?)').run(userId, schoolId, username, displayName, encoded, 'school_admin');
      this.db.exec('COMMIT'); return { schoolId, userId };
    } catch (error) { this.db.exec('ROLLBACK'); if ((error as Error).message.includes('UNIQUE constraint failed')) throw new AccountError('provisioning_conflict',409); throw error; }
  }
  async login(schoolSlug: string, username: string, password: string, now = Date.now()) {
    const row = this.db.prepare(`SELECT u.id, u.school_id, u.username, u.display_name AS displayName, u.role, u.password_hash
      FROM users u JOIN schools s ON s.id=u.school_id WHERE s.slug=? AND u.username=?`).get(schoolSlug, username) as unknown as UserRow | undefined;
    const valid = await verify(password, row?.password_hash ?? DUMMY_HASH);
    if (!valid || !row) throw new AccountError('invalid_credentials', 401);
    const token = randomBytes(32).toString('base64url');
    this.immediate(() => {
      const current = this.db.prepare('SELECT password_hash FROM users WHERE id=?').get(row.id) as { password_hash: string } | undefined;
      if (!current || current.password_hash !== row.password_hash) throw new AccountError('invalid_credentials', 401);
      this.db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);
      this.db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').run(hashToken(token), row.id, now + 8 * 60 * 60 * 1000);
    });
    return token;
  }
  /** Durable per-IP and global throttling; all workers share these SQLite counters. */
  private enforceResetRateLimit(clientAddress: string, now: number) {
    const ipScope = hashToken(`noon-password-reset-rate:v1:ip:${clientAddress}`);
    const globalScope = hashToken('noon-password-reset-rate:v1:global');
    const denied = this.immediate(() => {
      this.db.prepare('DELETE FROM password_reset_rate_limits WHERE window_started_at<=?').run(now - RESET_WINDOW_MS);
      const global = this.db.prepare('SELECT attempts FROM password_reset_rate_limits WHERE scope_hash=?').get(globalScope) as { attempts: number } | undefined;
      const ip = this.db.prepare('SELECT attempts FROM password_reset_rate_limits WHERE scope_hash=?').get(ipScope) as { attempts: number } | undefined;
      if (global && global.attempts >= RESET_GLOBAL_LIMIT) return true;
      if (ip && ip.attempts >= RESET_IP_LIMIT) return true;
      if (!global) this.db.prepare('INSERT INTO password_reset_rate_limits (scope_hash,window_started_at,attempts) VALUES (?,?,1)').run(globalScope, now);
      else this.db.prepare('UPDATE password_reset_rate_limits SET attempts=attempts+1 WHERE scope_hash=?').run(globalScope);
      if (!ip) this.db.prepare('INSERT INTO password_reset_rate_limits (scope_hash,window_started_at,attempts) VALUES (?,?,1)').run(ipScope, now);
      else this.db.prepare('UPDATE password_reset_rate_limits SET attempts=attempts+1 WHERE scope_hash=?').run(ipScope);
      return false;
    });
    if (denied) throw new AccountError('reset_rejected', 429);
  }
  /** One-time reset is permanently bound to the configured secret and fixed target. */
  async resetFixedSchoolAdminPassword(presentedSecret: string, configuredSecret: string, newPassword: string, clientAddress: string, now = Date.now()) {
    this.enforceResetRateLimit(clientAddress, now);
    const supplied = typeof presentedSecret === 'string' ? presentedSecret : '';
    const candidateDigest = Buffer.from(hashToken(supplied), 'hex');
    const configuredDigest = Buffer.from(hashToken(configuredSecret), 'hex');
    const secretMatches = isStrongResetSecret(configuredSecret) && timingSafeEqual(candidateDigest, configuredDigest);
    const validPassword = text(newPassword, 12, 128);
    if (!validPassword) throw new AccountError('reset_rejected');
    // Hash before rejecting a bad secret so successful and failed secret checks have similar work.
    const encoded = await passwordHash(newPassword);
    if (!secretMatches) throw new AccountError('reset_rejected');
    const tokenHash = hashToken(configuredSecret);
    this.immediate(() => {
      const targets = this.db.prepare(`SELECT u.id FROM users u JOIN schools s ON s.id=u.school_id
        WHERE s.slug=? AND u.username=? AND u.role='school_admin'`).all(RESET_TARGET_SCHOOL, RESET_TARGET_USERNAME) as Array<{ id: string }>;
      if (targets.length !== 1) throw new AccountError('reset_rejected');
      const consumed = this.db.prepare('INSERT OR IGNORE INTO password_reset_tokens (token_hash,consumed_at) VALUES (?,?)').run(tokenHash, now);
      if (Number(consumed.changes) !== 1) throw new AccountError('reset_rejected');
      const userId = targets[0].id;
      const updated = this.db.prepare(`UPDATE users SET password_hash=? WHERE id=? AND username=? AND role='school_admin'`).run(encoded, userId, RESET_TARGET_USERNAME);
      if (Number(updated.changes) !== 1) throw new AccountError('reset_rejected');
      this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
    });
  }
  identity(token: string, now = Date.now()) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new AccountError('unauthenticated', 401);
    const row = this.db.prepare(`SELECT u.id, u.school_id, u.username, u.display_name AS displayName, u.role,
      s.name AS schoolName, s.slug AS schoolSlug FROM sessions se JOIN users u ON u.id=se.user_id JOIN schools s ON s.id=u.school_id
      WHERE se.token_hash=? AND se.expires_at>?`).get(hashToken(token), now) as unknown as (UserRow & { schoolName: string; schoolSlug: string }) | undefined;
    if (!row) throw new AccountError('unauthenticated', 401);
    return { user: { id: row.id, username: row.username, displayName: row.displayName }, school: { id: row.school_id, slug: row.schoolSlug, name: row.schoolName }, role: row.role, csrfToken: csrfFor(token) };
  }
  logout(token: string) { this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hashToken(token)); }
  private authorize(token: string, schoolId: string) {
    const identity = this.identity(token);
    if (identity.school.id !== schoolId || identity.role !== 'school_admin') throw new AccountError('forbidden', 403);
    return identity;
  }
  listMembers(token: string, schoolId: string): Member[] {
    this.authorize(token, schoolId);
    return this.db.prepare('SELECT id,username,display_name AS displayName,role FROM users WHERE school_id=? ORDER BY username').all(schoolId) as unknown as Member[];
  }
  async createMember(token: string, schoolId: string, input: unknown): Promise<Member> {
    this.authorize(token, schoolId);
    const value = validateCredentials(input, true);
    const encoded = await passwordHash(value.password as string);
    this.authorize(token, schoolId);
    const id = randomUUID();
    try { this.db.prepare('INSERT INTO users (id,school_id,username,display_name,password_hash,role) VALUES (?,?,?,?,?,?)').run(id, schoolId, value.username as string, (value.displayName as string).trim(), encoded, value.role as string); }
    catch (error) { if ((error as Error).message.includes('UNIQUE constraint failed')) throw new AccountError('username_unavailable', 409); throw error; }
    return { id, username: value.username as string, displayName: (value.displayName as string).trim(), role: value.role as Role };
  }
}

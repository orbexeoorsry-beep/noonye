import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, fchmodSync, openSync, closeSync, constants } from 'node:fs';
import path from 'node:path';
import { localDatabasePath, assertCreatedDatabasePath } from './config';

const scrypt = promisify(scryptCallback);
export type Role = 'school_admin' | 'teacher' | 'student';
export interface Member { id: string; username: string; displayName: string; role: Role }
interface UserRow extends Member { school_id: string; password_hash: string }
export class AccountError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
export function hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
export function csrfFor(token: string) { return hashToken(`noon-csrf:${token}`); }
function text(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.length >= min && value.length <= max;
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

/** Local single-process repository. Accounts belong to exactly one school in this slice. */
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
      if (version !== 0 && version !== 1) throw new AccountError('unsupported_schema_version', 500);
      if (version === 0 && this.db.prepare("SELECT 1 FROM sqlite_schema WHERE name NOT GLOB 'sqlite_*' LIMIT 1").get()) throw new AccountError('unversioned_schema_requires_migration', 500);
      if (version === 1) {
        // Compatibility guard, not a migration or a proof of all constraints.
        try {
          this.db.prepare('SELECT id,slug,name FROM schools LIMIT 0').all();
          this.db.prepare('SELECT id,school_id,username,display_name,password_hash,role FROM users LIMIT 0').all();
          this.db.prepare('SELECT token_hash,user_id,expires_at FROM sessions LIMIT 0').all();
        } catch { throw new AccountError('unsupported_schema_shape', 500); }
      } else this.db.exec(`
      CREATE TABLE IF NOT EXISTS schools (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, school_id TEXT NOT NULL REFERENCES schools(id),
        username TEXT NOT NULL, display_name TEXT NOT NULL, password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('school_admin','teacher','student')),
        UNIQUE(school_id, username)
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL
      );
      PRAGMA user_version = 1;`);
      this.db.exec('COMMIT');
      transaction = false;
    } catch (error) {
      try { if (transaction) this.db.exec('ROLLBACK'); } finally { this.db.close(); }
      throw error;
    }
  }
  close() { this.db.close(); }
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
    this.db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);
    this.db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').run(hashToken(token), row.id, now + 8 * 60 * 60 * 1000);
    return token;
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

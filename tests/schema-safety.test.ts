import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { AccountError, AccountStore } from '../server/features/accounts/store';

const digest = (filename: string) => createHash('sha256').update(readFileSync(filename)).digest('hex');
const code = (expected: string) => (error: unknown) => error instanceof AccountError && error.code === expected;
const v1Schema = `
  CREATE TABLE schools (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL);
  CREATE TABLE users (id TEXT PRIMARY KEY, school_id TEXT NOT NULL REFERENCES schools(id), username TEXT NOT NULL,
    display_name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('school_admin','teacher','student')),
    UNIQUE(school_id, username));
  CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
  PRAGMA user_version=1;`;

test('empty database initializes to v2; reopening known schema preserves bytes and foreign-key enforcement', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'noon-schema-fresh-'));
  const filename = path.join(dir, 'synthetic.sqlite');
  try {
    const store = new AccountStore(filename);
    assert.equal(store.db.prepare('PRAGMA user_version').get()!.user_version, 2);
    assert.equal(store.db.prepare('PRAGMA foreign_keys').get()!.foreign_keys, 1);
    store.db.prepare('INSERT INTO schools VALUES (?,?,?)').run('synthetic-id', 'synthetic-school', 'Synthetic');
    store.close();
    const before = digest(filename);
    const reopened = new AccountStore(filename);
    try { assert.equal(reopened.db.prepare('SELECT COUNT(*) AS n FROM schools').get()!.n, 1); }
    finally { reopened.close(); }
    assert.equal(digest(filename), before);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('supported v1 schema migrates additively to v2 and preserves existing rows', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'noon-schema-v1-'));
  const filename = path.join(dir, 'synthetic.sqlite');
  try {
    const legacy = new DatabaseSync(filename);
    legacy.exec(v1Schema);
    legacy.exec("INSERT INTO schools VALUES ('school-id','al-horua','Synthetic'); INSERT INTO users VALUES ('user-id','school-id','walud','Synthetic Admin','synthetic-hash','school_admin');");
    legacy.close();
    const migrated = new AccountStore(filename);
    try {
      assert.equal(migrated.db.prepare('PRAGMA user_version').get()!.user_version, 2);
      assert.equal(migrated.db.prepare('SELECT password_hash FROM users WHERE id=?').get('user-id')!.password_hash, 'synthetic-hash');
      assert.equal(migrated.db.prepare("SELECT COUNT(*) AS n FROM sqlite_schema WHERE type='table' AND name IN ('password_reset_tokens','password_reset_rate_limits')").get()!.n, 2);
    } finally { migrated.close(); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('nonempty unversioned schema is never silently promoted, including sqlite-like user names', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'noon-schema-legacy-'));
  const filename = path.join(dir, 'synthetic.sqlite');
  try {
    const legacy = new DatabaseSync(filename);
    legacy.exec("CREATE TABLE sqlitelegacy(marker TEXT); INSERT INTO sqlitelegacy VALUES ('SYNTHETIC-LEGACY');");
    legacy.close();
    const before = digest(filename);
    assert.throws(() => new AccountStore(filename), code('unversioned_schema_requires_migration'));
    assert.equal(digest(filename), before);
    const check = new DatabaseSync(filename, { readOnly: true });
    try {
      assert.equal(check.prepare('PRAGMA user_version').get()!.user_version, 0);
      assert.equal(check.prepare('SELECT marker FROM sqlitelegacy').get()!.marker, 'SYNTHETIC-LEGACY');
      assert.equal(check.prepare("SELECT count(*) AS n FROM sqlite_schema WHERE name IN ('schools','users','sessions')").get()!.n, 0);
    } finally { check.close(); }
    assert.equal(digest(filename), before);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('declared v1 with missing core columns fails without creating missing tables or changing bytes', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'noon-schema-shape-'));
  const filename = path.join(dir, 'synthetic.sqlite');
  try {
    const malformed = new DatabaseSync(filename);
    malformed.exec('CREATE TABLE schools(id TEXT); PRAGMA user_version=1;'); malformed.close();
    const before = digest(filename);
    assert.throws(() => new AccountStore(filename), code('unsupported_schema_shape'));
    assert.equal(digest(filename), before);
    const check = new DatabaseSync(filename, { readOnly: true });
    try { assert.equal(check.prepare("SELECT count(*) AS n FROM sqlite_schema WHERE type='table'").get()!.n, 1); }
    finally { check.close(); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('declared v2 with malformed reset schema fails without repairing or changing bytes', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'noon-schema-v2-shape-'));
  const filename = path.join(dir, 'synthetic.sqlite');
  try {
    const malformed = new DatabaseSync(filename);
    malformed.exec(`${v1Schema.replace('PRAGMA user_version=1;', '')}
      CREATE TABLE password_reset_tokens (token_hash TEXT PRIMARY KEY, consumed_at INTEGER NOT NULL);
      CREATE TABLE password_reset_rate_limits (scope_hash TEXT PRIMARY KEY, window_started_at INTEGER NOT NULL);
      PRAGMA user_version=2;`);
    malformed.close();
    const before = digest(filename);
    assert.throws(() => new AccountStore(filename), code('unsupported_schema_shape'));
    assert.equal(digest(filename), before);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('declared v2 rejects reset tables without unique token and scope keys', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'noon-schema-v2-unique-'));
  try {
    for (const missingKey of ['token_hash', 'scope_hash']) {
      const filename = path.join(dir, `synthetic-${missingKey}.sqlite`);
      const malformed = new DatabaseSync(filename);
      const tokenHash = missingKey === 'token_hash' ? 'TEXT NOT NULL' : 'TEXT PRIMARY KEY';
      const scopeHash = missingKey === 'scope_hash' ? 'TEXT NOT NULL' : 'TEXT PRIMARY KEY';
      malformed.exec(`${v1Schema.replace('PRAGMA user_version=1;', '')}
        CREATE TABLE password_reset_tokens (token_hash ${tokenHash}, consumed_at INTEGER NOT NULL);
        CREATE TABLE password_reset_rate_limits (scope_hash ${scopeHash}, window_started_at INTEGER NOT NULL,
          attempts INTEGER NOT NULL CHECK (attempts > 0));
        PRAGMA user_version=2;`);
      malformed.close();
      const before = digest(filename);
      assert.throws(() => new AccountStore(filename), code('unsupported_schema_shape'));
      assert.equal(digest(filename), before);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('negative and future versions are rejected rather than downgraded or reinitialized', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'noon-schema-version-'));
  try {
    for (const version of [-1, 3]) {
      const filename = path.join(dir, `synthetic-${version}.sqlite`);
      const db = new DatabaseSync(filename); db.exec(`PRAGMA user_version=${version}`); db.close();
      const before = digest(filename);
      assert.throws(() => new AccountStore(filename), code('unsupported_schema_version'));
      assert.equal(digest(filename), before);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

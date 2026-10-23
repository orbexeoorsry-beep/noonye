import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { AccountError, AccountStore } from '../server/features/accounts/store';

const digest = (filename: string) => createHash('sha256').update(readFileSync(filename)).digest('hex');
const code = (expected: string) => (error: unknown) => error instanceof AccountError && error.code === expected;

test('empty database is initialized to v1; reopening known schema preserves bytes and foreign-key enforcement', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'noon-schema-fresh-'));
  const filename = path.join(dir, 'synthetic.sqlite');
  try {
    const store = new AccountStore(filename);
    assert.equal(store.db.prepare('PRAGMA user_version').get()!.user_version, 1);
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

test('negative and future versions are rejected rather than downgraded or reinitialized', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'noon-schema-version-'));
  try {
    for (const version of [-1, 2]) {
      const filename = path.join(dir, `synthetic-${version}.sqlite`);
      const db = new DatabaseSync(filename); db.exec(`PRAGMA user_version=${version}`); db.close();
      const before = digest(filename);
      assert.throws(() => new AccountStore(filename), code('unsupported_schema_version'));
      assert.equal(digest(filename), before);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

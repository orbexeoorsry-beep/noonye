import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createDatabaseSnapshot } from '../server/features/accounts/snapshot';

test('snapshot captures committed WAL content, excludes uncommitted content, and restores cleanly', () => {
  const base = mkdtempSync(path.join(tmpdir(), 'noon-snapshot-test-'));
  const app = path.join(base, 'app');
  const storage = path.join(base, 'private');
  mkdirSync(app);
  mkdirSync(storage);
  chmodSync(storage, 0o700);
  const sourcePath = path.join(storage, 'source.sqlite');
  const db = new DatabaseSync(sourcePath);
  let writer: DatabaseSync | undefined;
  let restored: DatabaseSync | undefined;
  try {
    db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE item(id INTEGER PRIMARY KEY, value TEXT NOT NULL); INSERT INTO item(value) VALUES (\'committed\');');
    const beforeBytes = readFileSync(sourcePath);
    const beforeHash = createHash('sha256').update(beforeBytes).digest('hex');
    writer = new DatabaseSync(sourcePath);
    writer.exec('BEGIN; INSERT INTO item(value) VALUES (\'uncommitted\');');

    const snapshot = createDatabaseSnapshot(db, 'snapshot.sqlite', storage, app);
    assert.equal(snapshot.sha256, createHash('sha256').update(readFileSync(snapshot.path)).digest('hex'));
    assert.equal(snapshot.size, lstatSync(snapshot.path).size);
    assert.equal(lstatSync(snapshot.path).mode & 0o777, 0o600);
    assert.deepEqual(db.prepare('SELECT value FROM item ORDER BY id').all().map(row => row.value), ['committed']);
    assert.deepEqual(writer.prepare('SELECT value FROM item ORDER BY id').all().map(row => row.value), ['committed', 'uncommitted']);

    assert.throws(() => createDatabaseSnapshot(db, 'snapshot.sqlite', storage, app));
    assert.equal(createHash('sha256').update(readFileSync(sourcePath)).digest('hex'), beforeHash);
    assert.deepEqual(db.prepare('SELECT value FROM item ORDER BY id').all().map(row => row.value), ['committed']);

    writer.exec('ROLLBACK;');
    writer.close(); writer = undefined;
    // Restore by snapshotting the produced backup with this same function.
    const backup = new DatabaseSync(snapshot.path);
    const clone = createDatabaseSnapshot(backup, 'clone.sqlite', storage, app);
    backup.close();
    restored = new DatabaseSync(clone.path);
    assert.deepEqual(restored.prepare('SELECT value FROM item ORDER BY id').all().map(row => row.value), ['committed']);
    assert.deepEqual(restored.prepare('PRAGMA integrity_check').all().map(row => row.integrity_check), ['ok']);
    restored.close(); restored = undefined;
    restored = new DatabaseSync(clone.path);
    assert.deepEqual(restored.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    try { writer?.exec('ROLLBACK'); } catch { /* already completed */ }
    writer?.close();
    restored?.close();
    db.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test('snapshot rejects traversal, pre-existing destination and existing sidecars', () => {
  const base = mkdtempSync(path.join(tmpdir(), 'noon-snapshot-path-test-'));
  const app = path.join(base, 'app'); const storage = path.join(base, 'private');
  mkdirSync(app); mkdirSync(storage); chmodSync(storage, 0o700);
  const source = new DatabaseSync(':memory:');
  try {
    assert.throws(() => createDatabaseSnapshot(source, '../escape.sqlite', storage, app));
    writeFileSync(path.join(storage, 'already.sqlite'), 'no overwrite');
    assert.throws(() => createDatabaseSnapshot(source, 'already.sqlite', storage, app));
    writeFileSync(path.join(storage, 'sidecar.sqlite-wal'), 'sentinel', { mode: 0o600 });
    assert.throws(() => createDatabaseSnapshot(source, 'sidecar.sqlite', storage, app));
    assert.equal(readFileSync(path.join(storage, 'already.sqlite'), 'utf8'), 'no overwrite');
    assert.equal(existsSync(path.join(storage, 'sidecar.sqlite')), false);
  } finally { source.close(); rmSync(base, { recursive: true, force: true }); }
});

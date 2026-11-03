import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkSync, lstatSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { getuid } from 'node:process';
import path from 'node:path';
import { localDatabasePath, productionDatabasePath } from '../server/features/accounts/config';

test('local paths reject protected named ancestors even outside application and reject hardlinked files or sidecars', () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'noon-persistent-'));
  try {
    const app = path.join(temp, 'app'); mkdirSync(app);
    for (const name of ['hbuilds', 'public_html', 'webroot', 'releases']) {
      const dir = path.join(temp, name); mkdirSync(dir);
      assert.throws(() => localDatabasePath(path.join(dir, 'db.sqlite'), app), name);
    }
    const privateDir = path.join(temp, 'private'); mkdirSync(privateDir);
    const db = path.join(privateDir, 'db.sqlite'); writeFileSync(db, 'synthetic');
    const dbAlias = path.join(privateDir, 'db-alias'); linkSync(db, dbAlias);
    assert.throws(() => localDatabasePath(db, app));
    rmSync(dbAlias);
    assert.equal(localDatabasePath(db, app), db);
    const sidecar = db + '-wal'; writeFileSync(sidecar, 'synthetic');
    const alias = path.join(privateDir, 'alias'); linkSync(sidecar, alias);
    assert.throws(() => localDatabasePath(db, app));
    rmSync(alias); rmSync(sidecar);
    symlinkSync(path.join(privateDir, 'absent'), db + '-shm');
    assert.throws(() => localDatabasePath(db, app));
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('production path requires private canonical owned mode-0700 root and validates existing db/sidecars without creating', () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'noon-production-'));
  try {
    const app = path.join(temp, 'app'); mkdirSync(app);
    const root = path.join(temp, 'private'); mkdirSync(root, { mode: 0o700 }); chmodSync(root, 0o700);
    const target = path.join(root, 'accounts.sqlite');
    assert.equal(productionDatabasePath('accounts.sqlite', root, app), target);
    assert.equal(lstatSync(root).mode & 0o777, 0o700);
    assert.throws(() => productionDatabasePath('../accounts.sqlite', root, app));
    assert.throws(() => productionDatabasePath('accounts.db', root, app));
    assert.throws(() => productionDatabasePath('accounts.sqlite', app, app));
    mkdirSync(path.join(temp, 'public_html'));
    chmodSync(path.join(temp, 'public_html'), 0o700);
    assert.throws(() => productionDatabasePath('x.sqlite', path.join(temp, 'public_html'), app));
    writeFileSync(target, 'synthetic', { mode: 0o600 });
    assert.equal(productionDatabasePath('accounts.sqlite', root, app), target);
    writeFileSync(target + '-journal', 'synthetic', { mode: 0o600 });
    const hard = path.join(root, 'hardlink'); linkSync(target + '-journal', hard);
    assert.throws(() => productionDatabasePath('accounts.sqlite', root, app));
    rmSync(hard); rmSync(target + '-journal');
    symlinkSync(target, target + '-wal');
    assert.throws(() => productionDatabasePath('accounts.sqlite', root, app));
    assert.equal(getuid?.(), lstatSync(root).uid);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('private storage rejects replaceable writable ancestors and parent symlinks, but accepts sticky temporary parents', () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'noon-ancestor-'));
  try {
    const app = path.join(temp, 'app'); mkdirSync(app);
    const parent = path.join(temp, 'parent'); mkdirSync(parent);
    const root = path.join(parent, 'private'); mkdirSync(root, { mode: 0o700 });
    chmodSync(parent, 0o777);
    assert.throws(() => productionDatabasePath('synthetic.sqlite', root, app), /ancestor/);
    chmodSync(parent, 0o770);
    assert.throws(() => productionDatabasePath('synthetic.sqlite', root, app), /ancestor/);
    chmodSync(parent, 0o1777);
    assert.equal(productionDatabasePath('synthetic.sqlite', root, app), path.join(root, 'synthetic.sqlite'));
    chmodSync(parent, 0o700);
    const alias = path.join(temp, 'alias'); symlinkSync(parent, alias);
    assert.throws(() => productionDatabasePath('synthetic.sqlite', path.join(alias, 'private'), app));
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

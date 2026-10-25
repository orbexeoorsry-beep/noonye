import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, symlinkSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { accountsConfig, localDatabasePath, assertCreatedDatabasePath, safeAccountHttpPath } from '../server/features/accounts/config';
const applicationRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('accounts are disabled by default and do not require or create a database', () => {
  assert.deepEqual(accountsConfig({}, applicationRoot), { enabled: false, origin: 'http://127.0.0.1:3000', database: undefined });
});
test('local mode rejects public origins, mismatched ports and nonpersistent paths', () => {
  const env = { NOON_ACCOUNTS_LOCAL: '1', NOON_LOCAL_ACCOUNTS_DB: path.join(tmpdir(), 'noon-config-only.sqlite') };
  assert.equal(accountsConfig(env, applicationRoot).origin, 'http://127.0.0.1:3000');
  for (const origin of ['https://example.com', 'http://0.0.0.0:3000', 'http://localhost:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3000/', 'http://user:pass@127.0.0.1:3000']) {
    assert.throws(() => accountsConfig({ ...env, NOON_LOCAL_ACCOUNTS_ORIGIN: origin }, applicationRoot));
  }
  assert.throws(() => accountsConfig({ NOON_ACCOUNTS_LOCAL: '1' }, applicationRoot));
  assert.throws(() => localDatabasePath(':memory:', applicationRoot));
  assert.throws(() => localDatabasePath('relative.sqlite', applicationRoot));
  assert.throws(() => localDatabasePath(path.join(applicationRoot, 'public', 'accounts.sqlite'), applicationRoot));
});
test('fixed trusted root rejects application containment independently of process CWD', () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'noon-root-test-'));
  const oldCwd = process.cwd();
  try {
    const root = path.join(temp, 'app'); mkdirSync(root);
    const outside = path.join(temp, 'unrelated-cwd'); mkdirSync(outside);
    process.chdir(outside);
    assert.throws(() => localDatabasePath(path.join(root, 'dist', 'accounts.sqlite'), root));
    assert.equal(localDatabasePath(path.join(temp, 'private', 'accounts.sqlite'), root), path.join(temp, 'private', 'accounts.sqlite'));
    assert.throws(() => localDatabasePath(path.join(temp, 'private', 'accounts.sqlite'), undefined as unknown as string));
  } finally { process.chdir(oldCwd); rmSync(temp, { recursive: true, force: true }); }
});
test('all symlink components, dangling final links, and raw traversal are rejected', () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'noon-links-test-'));
  try {
    const root = path.join(temp, 'app'); mkdirSync(root);
    const privateDir = path.join(temp, 'private'); mkdirSync(privateDir);
    const parentLink = path.join(temp, 'alias'); symlinkSync(privateDir, parentLink);
    const finalLink = path.join(temp, 'final.sqlite'); symlinkSync(path.join(root, 'dist', 'synthetic.sqlite'), finalLink);
    assert.throws(() => localDatabasePath(path.join(parentLink, 'accounts.sqlite'), root));
    assert.throws(() => localDatabasePath(finalLink, root));
    assert.throws(() => localDatabasePath(`${privateDir}/../app/dist/accounts.sqlite`, root));
    assert.throws(() => localDatabasePath(`${privateDir}/./accounts.sqlite`, root));
    const valid = path.join(privateDir, 'accounts.sqlite');
    assert.equal(localDatabasePath(valid, root), valid);
    assert.throws(() => assertCreatedDatabasePath(valid, root));
    writeFileSync(valid, 'synthetic file for post-create path validation');
    assert.doesNotThrow(() => assertCreatedDatabasePath(valid, root));
    rmSync(valid); symlinkSync(path.join(root, 'missing.sqlite'), valid);
    assert.throws(() => assertCreatedDatabasePath(valid, root));
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
test('HTTP path guard rejects database extensions and sidecars regardless of account toggle', () => {
  for (const local of [false, true]) for (const target of ['/synthetic.sqlite', '/synthetic.sqlite-wal', '/synthetic.sqlite-shm', '/synthetic.sqlite-journal', '/SYNTHETIC.SQLITE?download=1', '/synthetic%2esqlite', '/synthetic.db', '/synthetic.sqlite3-journal', '/../synthetic.txt', '/%2e%2e/synthetic.txt', '/%5c..%5csynthetic.sqlite']) {
    assert.equal(safeAccountHttpPath(target, applicationRoot, local), false, target);
  }
  assert.equal(safeAccountHttpPath('/@fs/private/accounts', applicationRoot, true), false);
  assert.equal(safeAccountHttpPath('/accounts', applicationRoot, true), true);
});

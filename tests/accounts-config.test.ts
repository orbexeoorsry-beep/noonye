import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { accountsConfig, localDatabasePath } from '../server/features/accounts/config';

test('accounts are disabled by default and do not require or create a database', () => {
  assert.deepEqual(accountsConfig({}), { enabled: false, origin: 'http://127.0.0.1:3000', database: undefined });
});
test('local mode rejects public origins, mismatched ports and nonpersistent paths', () => {
  const env = { NOON_ACCOUNTS_LOCAL: '1', NOON_LOCAL_ACCOUNTS_DB: '/tmp/noon-config-only.sqlite' };
  assert.equal(accountsConfig(env).origin, 'http://127.0.0.1:3000');
  for (const origin of ['https://example.com', 'http://0.0.0.0:3000', 'http://localhost:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3000/', 'http://user:pass@127.0.0.1:3000']) {
    assert.throws(() => accountsConfig({ ...env, NOON_LOCAL_ACCOUNTS_ORIGIN: origin }));
  }
  assert.throws(() => accountsConfig({ NOON_ACCOUNTS_LOCAL: '1' }));
  assert.throws(() => localDatabasePath(':memory:'));
  assert.throws(() => localDatabasePath('relative.sqlite'));
  assert.throws(() => localDatabasePath(path.join(process.cwd(), 'public', 'accounts.sqlite')));
});
test('database path follows existing ancestor symlinks before checking application containment', () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'noon-config-test-'));
  try {
    const root = path.join(temp, 'app'); mkdirSync(root);
    const link = path.join(temp, 'alias'); symlinkSync(root, link);
    assert.throws(() => localDatabasePath(path.join(link, 'new', 'accounts.sqlite'), root));
    assert.equal(localDatabasePath(path.join(temp, 'private', 'accounts.sqlite'), root), path.join(temp, 'private', 'accounts.sqlite'));
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

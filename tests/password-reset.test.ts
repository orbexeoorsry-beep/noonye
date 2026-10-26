import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { AccountError, AccountStore, hashToken, isStrongResetSecret } from '../server/features/accounts/store.js';
import { createAccountsRouter } from '../server/features/accounts/router.js';

const RESET_SECRET = randomBytes(32).toString('base64url');
const ORIGINAL_PASSWORD = 'synthetic-original-password';
const CLEANUP_PASSWORD = 'synthetic-cleanup-password';
type RunningRouter = { origin: string; close(): Promise<void> };

async function routerFor(store: AccountStore, secret?: string): Promise<RunningRouter> {
  const probe = express().listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => { probe.once('listening', resolve); probe.once('error', reject); });
  const address = probe.address();
  assert.ok(address && typeof address !== 'string');
  const port = address.port;
  await new Promise<void>(resolve => probe.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`;
  const app = express();
  app.use('/api', createAccountsRouter({ store, origin, enabled: true, temporaryPasswordResetSecret: secret }));
  // Match server.ts: the app-level parser is mounted after the account router.
  app.use(express.json({ limit: '5mb' }));
  const server = app.listen(port, '127.0.0.1');
  await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  return { origin, close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) };
}

function resetRequest(router: RunningRouter, password: string, secret = RESET_SECRET) {
  return fetch(`${router.origin}/api/accounts/temporary-password-reset`, {
    method: 'POST',
    headers: { Origin: router.origin, 'Content-Type': 'application/json', 'x-noon-password-reset': secret },
    body: JSON.stringify({ password }),
  });
}

function rejectedReset(error: unknown, status?: number) {
  return error instanceof AccountError && error.code === 'reset_rejected' && (status === undefined || error.status === status);
}

async function seed(store: AccountStore) {
  const target = await store.bootstrapSchool('al-horua', 'Synthetic School', 'walud', ORIGINAL_PASSWORD, 'Synthetic Admin');
  const other = await store.bootstrapSchool('other-synthetic-school', 'Other Synthetic School', 'walud', 'synthetic-other-password', 'Other Admin');
  return { target, other };
}

test('temporary reset endpoint is absent unless an environment secret is supplied', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'noon-reset-gate-'));
  const store = new AccountStore(path.join(directory, 'synthetic.sqlite'));
  let server: RunningRouter | undefined;
  try {
    await seed(store);
    server = await routerFor(store);
    const response = await resetRequest(server, CLEANUP_PASSWORD);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), '{"error":"not_found"}');
    assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM password_reset_tokens').get()!.n, 0);
    assert.ok(store.identity(await store.login('al-horua', 'walud', ORIGINAL_PASSWORD)));
    await server.close();
    server = await routerFor(store, 'x'.repeat(32));
    const weakSecret = await resetRequest(server, CLEANUP_PASSWORD, 'x'.repeat(32));
    assert.equal(weakSecret.status, 404);
    assert.equal(await weakSecret.text(), '{"error":"not_found"}');
  } finally {
    await server?.close();
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('login rejects a stale scrypt verification if the stored hash changes before session insertion', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'noon-reset-login-race-'));
  const store = new AccountStore(path.join(directory, 'synthetic.sqlite'));
  try {
    const { target } = await seed(store);
    const pendingLogin = store.login('al-horua', 'walud', ORIGINAL_PASSWORD);
    store.db.prepare('UPDATE users SET password_hash=? WHERE id=?').run('synthetic-replacement-hash', target.userId);
    await assert.rejects(pendingLogin, (error: unknown) => error instanceof AccountError && error.code === 'invalid_credentials');
    assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id=?').get(target.userId)!.n, 0);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('fixed-target reset is generic, atomic, replay-safe, and leaves other schools and users alone', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'noon-reset-http-'));
  const filename = path.join(directory, 'synthetic.sqlite');
  const store = new AccountStore(filename);
  let server: RunningRouter | undefined;
  try {
    const { target, other } = await seed(store);
    const targetSession = await store.login('al-horua', 'walud', ORIGINAL_PASSWORD);
    const otherSession = await store.login('other-synthetic-school', 'walud', 'synthetic-other-password');
    server = await routerFor(store, RESET_SECRET);

    const wrong = await resetRequest(server, CLEANUP_PASSWORD, 'wrong-synthetic-reset-secret');
    assert.equal(wrong.status, 400);
    const wrongBody = await wrong.text();
    assert.equal(wrongBody, '{"error":"reset_rejected"}');
    assert.equal(wrongBody.includes(RESET_SECRET), false);

    const [first, second] = await Promise.all([
      resetRequest(server, 'synthetic-new-password-one'),
      resetRequest(server, 'synthetic-new-password-two'),
    ]);
    assert.deepEqual([first.status, second.status].sort(), [200, 400]);
    const winner = first.status === 200 ? 'synthetic-new-password-one' : 'synthetic-new-password-two';
    const loser = first.status === 400 ? 'synthetic-new-password-one' : 'synthetic-new-password-two';
    const successBody = await (first.status === 200 ? first : second).text();
    const failureBody = await (first.status === 400 ? first : second).text();
    assert.equal(successBody, '{"ok":true}');
    assert.equal(failureBody, '{"error":"reset_rejected"}');
    assert.equal(successBody.includes(RESET_SECRET), false);
    assert.equal(server.origin.includes(RESET_SECRET), false);

    assert.throws(() => store.identity(targetSession), (error: unknown) => error instanceof AccountError && error.code === 'unauthenticated');
    assert.equal(store.identity(otherSession).school.slug, 'other-synthetic-school');
    assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id=?').get(target.userId)!.n, 0);
    assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id=?').get(other.userId)!.n, 1);
    assert.equal(store.db.prepare('SELECT token_hash FROM password_reset_tokens').get()!.token_hash, hashToken(RESET_SECRET));
    assert.notEqual(store.db.prepare('SELECT token_hash FROM password_reset_tokens').get()!.token_hash, RESET_SECRET);
    assert.equal(store.identity(await store.login('al-horua', 'walud', winner)).user.username, 'walud');
    await assert.rejects(store.login('al-horua', 'walud', loser), (error: unknown) => error instanceof AccountError && error.code === 'invalid_credentials');
    assert.equal(store.identity(await store.login('other-synthetic-school', 'walud', 'synthetic-other-password')).school.slug, 'other-synthetic-school');

    const replay = await resetRequest(server, CLEANUP_PASSWORD);
    assert.equal(replay.status, 400);
    assert.equal(await replay.text(), '{"error":"reset_rejected"}');
    assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM password_reset_tokens').get()!.n, 1);
    assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id=?').get(target.userId)!.n, 1);
  } finally {
    await server?.close();
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('one-time consumption and rate limits are durable across AccountStore connections', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'noon-reset-shared-'));
  const filename = path.join(directory, 'synthetic.sqlite');
  const first = new AccountStore(filename);
  let second: AccountStore | undefined;
  try {
    const { target } = await seed(first);
    second = new AccountStore(filename);
    const results = await Promise.allSettled([
      first.resetFixedSchoolAdminPassword(RESET_SECRET, RESET_SECRET, 'synthetic-worker-password-one', '198.51.100.25'),
      second.resetFixedSchoolAdminPassword(RESET_SECRET, RESET_SECRET, 'synthetic-worker-password-two', '198.51.100.25'),
    ]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter(result => result.status === 'rejected' && rejectedReset(result.reason)).length, 1);
    const winner = results[0].status === 'fulfilled' ? 'synthetic-worker-password-one' : 'synthetic-worker-password-two';
    first.close();
    second.close();
    second = new AccountStore(filename);
    await assert.rejects(second.resetFixedSchoolAdminPassword(RESET_SECRET, RESET_SECRET, 'synthetic-replay-password', '198.51.100.26'), rejectedReset);
    assert.equal(second.db.prepare('SELECT COUNT(*) AS n FROM password_reset_tokens').get()!.n, 1);
    assert.equal(second.identity(await second.login('al-horua', 'walud', winner)).user.id, target.userId);
  } finally {
    try { first.close(); } catch { /* already closed before reopen */ }
    second?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('shared rate limit counts failed attempts across independent SQLite connections', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'noon-reset-rate-'));
  const filename = path.join(directory, 'synthetic.sqlite');
  const first = new AccountStore(filename);
  let second: AccountStore | undefined;
  try {
    await seed(first);
    second = new AccountStore(filename);
    for (let i = 0; i < 10; i++) {
      await assert.rejects(
        (i % 2 ? second : first)!.resetFixedSchoolAdminPassword('wrong-synthetic-secret', RESET_SECRET, 'synthetic-valid-password', '198.51.100.77'),
        rejectedReset,
      );
    }
    await assert.rejects(
      second.resetFixedSchoolAdminPassword('wrong-synthetic-secret', RESET_SECRET, 'synthetic-valid-password', '198.51.100.77'),
      (error: unknown) => rejectedReset(error, 429),
    );
    assert.equal(first.db.prepare('SELECT COUNT(*) AS n FROM password_reset_tokens').get()!.n, 0);
  } finally {
    first.close();
    second?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('per-IP cap does not consume global attempts and global cap still blocks new IP scopes', async () => {
  const store = new AccountStore(':memory:');
  try {
    assert.equal(isStrongResetSecret(RESET_SECRET), true);
    assert.equal(isStrongResetSecret('x'.repeat(32)), false);
    assert.equal(isStrongResetSecret(`${'A'.repeat(42)}B`), false);
    const globalScope = hashToken('noon-password-reset-rate:v1:global');
    const primaryIp = 'synthetic-ip-primary';
    const primaryIpScope = hashToken(`noon-password-reset-rate:v1:ip:${primaryIp}`);
    const attempts = (scope: string) => (store.db.prepare('SELECT attempts FROM password_reset_rate_limits WHERE scope_hash=?').get(scope) as { attempts: number } | undefined)?.attempts;
    for (let i = 0; i < 10; i++) {
      await assert.rejects(
        store.resetFixedSchoolAdminPassword('bad', RESET_SECRET, 'x', primaryIp),
        rejectedReset,
      );
    }
    assert.equal(attempts(globalScope), 10);
    assert.equal(attempts(primaryIpScope), 10);
    await assert.rejects(
      store.resetFixedSchoolAdminPassword('bad', RESET_SECRET, 'x', primaryIp),
      (error: unknown) => rejectedReset(error, 429),
    );
    assert.equal(attempts(globalScope), 10);
    assert.equal(attempts(primaryIpScope), 10);

    const otherIp = 'synthetic-ip-other';
    const otherIpScope = hashToken(`noon-password-reset-rate:v1:ip:${otherIp}`);
    await assert.rejects(
      store.resetFixedSchoolAdminPassword('bad', RESET_SECRET, 'x', otherIp),
      rejectedReset,
    );
    assert.equal(attempts(globalScope), 11);
    assert.equal(attempts(otherIpScope), 1);
    for (let i = 0; i < 109; i++) {
      await assert.rejects(
        store.resetFixedSchoolAdminPassword('bad', RESET_SECRET, 'x', `synthetic-ip-global-${i}`),
        rejectedReset,
      );
    }
    assert.equal(attempts(globalScope), 120);
    const lateIp = 'synthetic-ip-after-global-cap';
    const lateIpScope = hashToken(`noon-password-reset-rate:v1:ip:${lateIp}`);
    await assert.rejects(
      store.resetFixedSchoolAdminPassword('bad', RESET_SECRET, 'x', lateIp),
      (error: unknown) => rejectedReset(error, 429),
    );
    assert.equal(attempts(globalScope), 120);
    assert.equal(store.db.prepare('SELECT 1 FROM password_reset_rate_limits WHERE scope_hash=?').get(lateIpScope), undefined);
    assert.equal((store.db.prepare('SELECT COUNT(*) AS n FROM password_reset_rate_limits').get() as { n: number }).n, 112);
  } finally {
    store.close();
  }
});

test('reset rejects ambiguous matching school-admin rows without consuming the secret or deleting sessions', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'noon-reset-ambiguous-'));
  const filename = path.join(directory, 'synthetic.sqlite');
  let store = new AccountStore(filename);
  try {
    const target = await store.bootstrapSchool('al-horua', 'Synthetic School', 'walud', ORIGINAL_PASSWORD, 'Synthetic Admin');
    store.close();
    const raw = new DatabaseSync(filename);
    raw.exec(`PRAGMA foreign_keys=OFF;
      DROP TABLE users;
      CREATE TABLE users (id TEXT PRIMARY KEY, school_id TEXT NOT NULL REFERENCES schools(id), username TEXT NOT NULL,
        display_name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('school_admin','teacher','student')));
      INSERT INTO users VALUES ('target-one','${target.schoolId}','walud','One','hash-one','school_admin');
      INSERT INTO users VALUES ('target-two','${target.schoolId}','walud','Two','hash-two','school_admin');
      INSERT INTO sessions VALUES ('${'a'.repeat(64)}','target-one',9999999999999);
      INSERT INTO sessions VALUES ('${'b'.repeat(64)}','target-two',9999999999999);`);
    raw.close();
    store = new AccountStore(filename);
    await assert.rejects(
      store.resetFixedSchoolAdminPassword(RESET_SECRET, RESET_SECRET, 'synthetic-new-admin-password', '198.51.100.88'),
      rejectedReset,
    );
    assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM password_reset_tokens').get()!.n, 0);
    assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM sessions').get()!.n, 2);
    const rows = store.db.prepare("SELECT id,password_hash FROM users WHERE username='walud' ORDER BY id").all() as Array<{ id: string; password_hash: string }>;
    assert.deepEqual(rows.map(row => ({ id: row.id, password_hash: row.password_hash })), [
      { id: 'target-one', password_hash: 'hash-one' }, { id: 'target-two', password_hash: 'hash-two' },
    ]);
  } finally {
    try { store.close(); } catch { /* store was closed before the synthetic schema rewrite */ }
    rmSync(directory, { recursive: true, force: true });
  }
});

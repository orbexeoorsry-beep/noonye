import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { request } from 'node:http';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { AccountStore } from '../server/features/accounts/store';
import { createAccountsRouter } from '../server/features/accounts/router';
import { accountsRuntimeConfig, configureAccountsProxy } from '../server/features/accounts/runtime';
import { safeAccountHttpPath } from '../server/features/accounts/config';

const origin = 'https://schools.example.test';
test('production configuration fails closed without explicit private storage and loopback proxy', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'noon-prod-config-'));
  try {
    const app = path.join(dir, 'app'), storage = path.join(dir, 'private');
    mkdirSync(app); mkdirSync(storage, { mode: 0o700 });
    const values = { NOON_ACCOUNTS_MODE: 'proxy-production', NOON_ACCOUNTS_ORIGIN: origin, NOON_ACCOUNTS_PROXY_IP: '127.0.0.1', NOON_ACCOUNTS_DB: path.join(storage, 'synthetic.sqlite'), NOON_ACCOUNTS_STORAGE_ROOT: storage };
    assert.equal(accountsRuntimeConfig(values, app).origin, origin);
    assert.throws(() => accountsRuntimeConfig({ ...values, NOON_ACCOUNTS_PROXY_IP: 'true' }, app));
    assert.throws(() => accountsRuntimeConfig({ ...values, NOON_ACCOUNTS_ORIGIN: 'http://schools.example.test' }, app));
    assert.throws(() => accountsRuntimeConfig({ ...values, NOON_ACCOUNTS_ORIGIN: origin + '/' }, app));
    assert.throws(() => accountsRuntimeConfig({ ...values, NOON_ACCOUNTS_LOCAL: '1' }, app));
    assert.throws(() => accountsRuntimeConfig({ ...values, NOON_ACCOUNTS_STORAGE_ROOT: undefined }, app));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('bounded synthetic loopback proxy session, CSRF, expiry and DB HTTP smoke', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'noon-prod-http-'));
  const appRoot = path.join(dir, 'app'); mkdirSync(appRoot);
  const dbPath = path.join(dir, 'synthetic.sqlite');
  const store = new AccountStore(dbPath, appRoot);
  const app = express();
  configureAccountsProxy(app, '127.0.0.1');
  app.use((req, res, next) => { if (!safeAccountHttpPath(req.originalUrl, appRoot, true, dbPath)) { res.status(404).end(); return; } next(); });
  app.use('/api', createAccountsRouter({ store, origin, enabled: true, mode: 'proxy-production', proxyAddress: '127.0.0.1' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const port = (server.address() as { port: number }).port;
  const call = (route: string, method = 'GET', headers: Record<string, string> = {}, body?: object, localAddress?: string) => new Promise<{ status: number; headers: import('node:http').IncomingHttpHeaders; body: any }>((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path: route, method, localAddress, headers: { Host: 'schools.example.test', 'X-Forwarded-Proto': 'https', 'X-Forwarded-For': '192.0.2.10', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers } }, res => {
      let text = ''; res.setEncoding('utf8'); res.on('data', x => { text += x; });
      res.on('end', () => resolve({ status: res.statusCode!, headers: res.headers, body: text ? JSON.parse(text) : undefined }));
    });
    req.setTimeout(3000, () => req.destroy(new Error('bounded smoke timeout'))); req.on('error', reject); req.end(body ? JSON.stringify(body) : undefined);
  });
  try {
    await store.bootstrapSchool('synthetic-school', 'Synthetic School', 'admin', 'synthetic-only-password', 'Synthetic Admin');
    const credentials = { schoolSlug: 'synthetic-school', username: 'admin', password: 'synthetic-only-password' };
    assert.equal((await call('/api/accounts/me', 'GET', { 'X-Forwarded-Proto': 'http' })).status, 403);
    assert.equal((await call('/api/accounts/me', 'GET', { 'X-Forwarded-Proto': 'https,http' })).status, 403);
    assert.equal((await call('/api/accounts/me', 'GET', {}, undefined, '127.0.0.2')).status, 403);
    assert.equal((await call('/api/accounts/login', 'POST', { Origin: 'https://evil.example.test' }, credentials)).status, 403);
    assert.equal((await call('/api/accounts/login', 'POST', {}, credentials)).status, 403);
    assert.equal((await call('/api/accounts/login', 'POST', { Origin: origin, Host: 'evil.example.test' }, credentials)).status, 403);
    assert.equal((await call('/api/accounts/me', 'GET', { 'X-Forwarded-Host': 'evil.example.test' })).status, 403);
    assert.equal((await call('/api/accounts/login', 'POST', { Origin: origin, 'Sec-Fetch-Site': 'cross-site' }, credentials)).status, 403);
    const first = await call('/api/accounts/login', 'POST', { Origin: origin }, credentials);
    assert.equal(first.status, 200);
    const set = first.headers['set-cookie']![0];
    assert.match(set, /^__Host-noon_session=/); assert.match(set, /; Secure/); assert.match(set, /; HttpOnly/); assert.match(set, /; SameSite=Strict/); assert.match(set, /; Path=\/(?:;|$)/); assert.doesNotMatch(set, /Domain=/i);
    const cookie = set.split(';')[0];
    assert.equal((await call('/api/accounts/me', 'GET', { Cookie: cookie })).status, 200);
    assert.equal((await call('/api/accounts/me', 'GET', { Cookie: cookie + '; ' + cookie })).status, 401);
    assert.equal((await call('/api/accounts/logout', 'POST', { Cookie: cookie, Origin: origin })).status, 403);
    const second = await call('/api/accounts/login', 'POST', { Cookie: cookie, Origin: origin }, credentials);
    assert.equal(second.status, 200);
    assert.equal((await call('/api/accounts/me', 'GET', { Cookie: cookie })).status, 401);
    const secondCookie = second.headers['set-cookie']![0].split(';')[0];
    const logout = await call('/api/accounts/logout', 'POST', { Cookie: secondCookie, Origin: origin, 'X-CSRF-Token': second.body.csrfToken });
    assert.equal(logout.status, 204); assert.match(logout.headers['set-cookie']![0], /; Secure/);
    assert.equal((await call('/api/accounts/me', 'GET', { Cookie: secondCookie })).status, 401);
    // One selected HTTP path checks the whole guarded DB family route, without downloading a DB.
    assert.equal((await call('/synthetic.sqlite-wal')).status, 404);
    const expired = await store.login('synthetic-school', 'admin', 'synthetic-only-password', 1);
    assert.throws(() => store.identity(expired, 1 + 8 * 60 * 60 * 1000));
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve())); store.close(); rmSync(dir, { recursive: true, force: true });
  }
});

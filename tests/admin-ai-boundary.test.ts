import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { mountAdminAiBoundary } from '../server/security/admin-ai-boundary';

const app = express();
let downstreamCalls = 0;
mountAdminAiBoundary(app);
app.use((_req, _res, next) => { downstreamCalls += 1; next(); });
app.use(express.json({ limit: '1kb' }));
app.use((_req, res) => { res.status(200).send('SPA fallback'); });
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
assert.ok(address && typeof address !== 'string');
const base = `http://127.0.0.1:${address.port}`;
const sentinel = 'SYNTHETIC-NOT-A-REAL-PROVIDER-KEY';
try {
  for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']) {
    for (const path of ['/api/admin/ai', '/api/admin/ai/', '/api/admin/ai/providers/gemini/activate', '/api/admin/ai/providers/openai/rotate', '/api/admin/ai/providers/unknown/disable', '/API/ADMIN/AI/keys']) {
      const response = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Role': 'admin', Authorization: 'Bearer fake-admin-token' },
        ...(!['GET', 'HEAD'].includes(method) ? { body: `{"key":"${sentinel}","enabled":true}` } : {}),
      });
      assert.equal(response.status, 503, `${method} ${path} must be closed`);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const body = await response.text();
      assert.ok(!body.includes(sentinel));
      if (method !== 'HEAD') {
        const result = JSON.parse(body);
        assert.equal(result.code, 'ADMIN_AI_SETUP_UNAVAILABLE');
        assert.equal(result.aiEnabled, false);
        assert.deepEqual(Object.keys(result).sort(), ['aiEnabled', 'code', 'message', 'success']);
      }
    }
  }
  for (const body of ['{invalid-json', JSON.stringify({ key: sentinel.repeat(1000) })]) {
    const response = await fetch(base + '/api/admin/ai/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    assert.equal(response.status, 503, 'refuse before parsing even malformed or oversized JSON');
    assert.ok(!(await response.text()).includes(sentinel));
  }
  assert.equal(downstreamCalls, 0, 'must not reach body parser, providers, or SPA fallback');
  const source = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
  assert.ok(source.indexOf('mountAdminAiBoundary(app)') < source.indexOf('app.use(express.json('));
  assert.ok(source.indexOf('mountAdminAiBoundary(app)') < source.indexOf('express.static('));
  assert.equal((await fetch(base + '/unrelated')).status, 200, 'unrelated routes are unchanged');
  console.log('Admin AI boundary: 42 method/path cases + malformed/oversized input passed; no key handling or provider calls.');
} finally {
  await new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeAllConnections(); });
}

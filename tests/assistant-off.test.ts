import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';

const port = 32000 + Math.floor(Math.random() * 10000);
const child = spawn('node_modules/.bin/tsx', ['server.ts'], {
  cwd: process.cwd(), env: { ...process.env, PORT: String(port), NODE_ENV: 'development' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', (chunk) => { logs += chunk.toString(); });
child.stderr.on('data', (chunk) => { logs += chunk.toString(); });

function request(body: string): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: '/api/assistant/explain', method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } }, (res) => {
      let text = ''; res.setEncoding('utf8'); res.on('data', (chunk) => text += chunk); res.on('end', () => resolve({ status: res.statusCode || 0, text }));
    });
    req.on('error', reject); req.end(body);
  });
}

try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { const r = await request('{}'); if (r.status === 503) { ready = true; break; } } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(ready, 'server did not become ready');
  const payloads = ['{"selectedText":"SYNTHETIC_SECRET_TEXT"}', '{malformed SYNTHETIC_MALFORMED}', 'x'.repeat(6 * 1024 * 1024)];
  for (const payload of payloads) {
    const result = await request(payload);
    assert.equal(result.status, 503);
    assert.equal(result.text, 'Assistant unavailable');
    assert.ok(!result.text.includes('SYNTHETIC'));
  }
  await new Promise((r) => setTimeout(r, 200));
  assert.ok(!logs.includes('SYNTHETIC_SECRET_TEXT'));
  assert.ok(!logs.includes('SYNTHETIC_MALFORMED'));
  assert.ok(!logs.includes('entity.parse.failed'));
  // Gateway implementation is statically fail-closed; no fetch is permitted in it.
  const fs = await import('node:fs');
  const gateway = fs.readFileSync('src/services/aiGateway.ts', 'utf8');
  assert.ok(!gateway.includes('fetch('), 'gateway must not issue outbound requests');
  console.log('PASS: valid, malformed, oversized requests all receive static 503; no body leak/parser error/outbound gateway');
} finally { child.kill('SIGTERM'); await once(child, 'exit').catch(() => undefined); }

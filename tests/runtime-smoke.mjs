import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const manifest = JSON.parse(await readFile(path.join(dist, 'manifest.json'), 'utf8'));
assert.equal(manifest.schemaVersion, 1);
assert.ok(manifest.source.commit && manifest.source.tree);
assert.equal(typeof manifest.source.dirty, 'boolean');
assert.equal(typeof manifest.source.dirtyStatus, 'string');
async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full, base));
    else if (path.relative(base, full).split(path.sep).join('/') !== 'manifest.json') files.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return files.sort();
}
assert.deepEqual(manifest.files.map((item) => item.path).sort(), await listFiles(dist), 'manifest inventory should exactly match dist files');
for (const item of manifest.files) {
  const bytes = await readFile(path.join(dist, item.path));
  assert.equal(bytes.length, item.size, `size mismatch: ${item.path}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, `hash mismatch: ${item.path}`);
}
const portServer = net.createServer();
await new Promise((resolve) => portServer.listen(0, '127.0.0.1', resolve));
const port = portServer.address().port;
await new Promise((resolve) => portServer.close(resolve));
const cwd = await mkdtemp(path.join(os.tmpdir(), 'noonye-runtime-'));
const child = spawn(process.execPath, [path.join(dist, 'server.mjs')], { cwd, env: { ...process.env, NODE_ENV: 'production', PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = '';
child.stdout.on('data', (chunk) => { logs += chunk; });
child.stderr.on('data', (chunk) => { logs += chunk; });
const base = `http://127.0.0.1:${port}`;
try {
  let response;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null) throw new Error(`server exited early: ${logs}`);
    try { response = await fetch(`${base}/api/health`); break; } catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  assert.ok(response, `server did not start: ${logs}`);
  assert.deepEqual(await response.json(), { status: 'ok', geminiAvailable: false, aiEnabled: false });
  response = await fetch(`${base}/api/admin/ai`);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).aiEnabled, false);
  response = await fetch(`${base}/api/assistant/explain`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: 'ignored' }) });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).aiDisabled, true);
  response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  response = await fetch(`${base}/`);
  assert.equal(response.status, 200);
  const html = await response.text();
  const index = await readFile(path.join(dist, 'client', 'index.html'));
  assert.equal(html, index.toString());
  response = await fetch(`${base}/library/review`);
  assert.equal(response.status, 200, 'SPA deep route should serve index');
  assert.equal(await response.text(), index.toString());
  const assets = [...html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))"/g)].map((match) => match[1]);
  assert.ok(assets.length, 'built index should reference JS/CSS assets');
  for (const asset of assets) {
    const artifact = await readFile(path.join(dist, 'client', asset.replace(/^\//, '')));
    response = await fetch(`${base}${asset}`);
    assert.equal(response.status, 200, `asset status: ${asset}`);
    const fetched = Buffer.from(await response.arrayBuffer());
    assert.deepEqual(fetched, artifact, `asset mismatch: ${asset}`);
  }
  const worker = (await readdir(path.join(dist, 'client', 'assets'))).find((file) => file.startsWith('pdf.worker') && file.endsWith('.mjs'));
  assert.ok(worker, 'built PDF worker should exist');
  for (const asset of [`/assets/${worker}`, '/pdfjs/cmaps/78-EUC-H.bcmap']) {
    const local = await readFile(path.join(dist, 'client', asset.slice(1)));
    response = await fetch(`${base}${asset}`);
    assert.equal(response.status, 200, `PDF asset status: ${asset}`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), local, `PDF asset bytes: ${asset}`);
  }
  response = await fetch(`${base}/api/not-a-route`);
  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type'), /application\/json/);
  response = await fetch(`${base}/server.mjs`);
  assert.equal(response.status, 404);
  response = await fetch(`${base}/server.ts`);
  assert.equal(response.status, 404);
} finally {
  child.kill('SIGTERM');
  await Promise.race([new Promise((resolve) => child.once('exit', resolve)), new Promise((_, reject) => setTimeout(() => reject(new Error('server failed to shut down')), 5000))]);
  await rm(cwd, { recursive: true, force: true });
}
console.log('Production runtime smoke test passed');

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const expectedBodyParserVersion = '1.20.9';

test('Express resolves patched body-parser and survives compressed trailing bytes', { timeout: 15000 }, async () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const npmLock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
  const bunLock = readFileSync(resolve(root, 'bun.lock'), 'utf8');
  const bunMatches = [...bunLock.matchAll(/"body-parser": \["body-parser@([^"]+)"/g)];
  const projectRequire = createRequire(resolve(root, 'package.json'));
  const expressRequire = createRequire(projectRequire.resolve('express'));
  const expressVersion = projectRequire('express/package.json').version;
  const bodyParserVersion = projectRequire('body-parser/package.json').version;
  const expressResolvedBodyParser = expressRequire.resolve('body-parser');

  assert.equal(manifest.overrides?.['body-parser'], expectedBodyParserVersion);
  assert.equal(npmLock.packages['node_modules/body-parser']?.version, expectedBodyParserVersion);
  assert.equal(bunMatches.length, 1, 'bun.lock must contain one body-parser package entry');
  assert.equal(bunMatches[0][1], expectedBodyParserVersion);
  assert.equal(expressVersion, '4.22.3');
  assert.equal(bodyParserVersion, expectedBodyParserVersion);
  assert.equal(expressResolvedBodyParser, projectRequire.resolve('body-parser'));

  const serverCode = `
import express from 'express';
import http from 'node:http';
const app = express();
app.use(express.json());
app.post('/probe', (req, res) => res.status(200).json({ parsed: req.body.marker === 'synthetic-only' }));
const server = http.createServer(app);
server.listen(0, '127.0.0.1', () => process.stdout.write('READY:' + server.address().port + '\\n'));
`;
  const child = spawn(process.execPath, ['--input-type=module', '--eval', serverCode], {
    cwd: root,
    env: { PATH: process.env.PATH ?? '/usr/bin:/bin' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  let port;
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolvePromise, rejectPromise) => {
    resolveReady = resolvePromise;
    rejectReady = rejectPromise;
  });
  const readyTimer = setTimeout(() => rejectReady(new Error('synthetic server ready timeout')), 10000);

  child.stdout.on('data', chunk => {
    stdout += chunk.toString();
    const match = stdout.match(/READY:(\d+)/);
    if (match && !port) {
      port = Number(match[1]);
      clearTimeout(readyTimer);
      resolveReady(port);
    }
  });
  child.stderr.on('data', chunk => { stderr += chunk.toString(); });
  child.once('error', error => {
    clearTimeout(readyTimer);
    rejectReady(error);
  });
  child.once('exit', (code, signal) => {
    if (!port) {
      clearTimeout(readyTimer);
      rejectReady(new Error(`synthetic server exited before ready: code=${code} signal=${signal}; ${stderr}`));
    }
  });

  let observed;
  try {
    const boundPort = await ready;
    const payload = Buffer.from(JSON.stringify({ marker: 'synthetic-only' }));
    const body = Buffer.concat([gzipSync(payload), Buffer.from([0x00, 0xff, 0x54, 0x41, 0x49, 0x4c])]);
    const response = await fetch(`http://127.0.0.1:${boundPort}/probe`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-encoding': 'gzip',
        'content-length': String(body.length),
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    const responseText = await response.text();
    assert.equal(response.status, 200, `unexpected response: ${response.status} ${responseText}`);
    assert.equal(responseText, '{"parsed":true}');
    assert.deepEqual(JSON.parse(responseText), { parsed: true });

    await delay(1000);
    assert.equal(child.exitCode, null, `server exited after response: code=${child.exitCode}; stderr=${stderr}`);
    assert.equal(child.signalCode, null, `server was signaled after response: signal=${child.signalCode}; stderr=${stderr}`);
    observed = {
      requestCount: 1,
      bindAddress: '127.0.0.1',
      bunLockBodyParser: bunMatches[0][1],
      npmLockBodyParser: npmLock.packages['node_modules/body-parser'].version,
      expressVersion,
      resolvedBodyParserVersion: bodyParserVersion,
      encodedBytes: body.length,
      trailingBytes: 6,
      responseStatus: response.status,
      responseText,
      aliveAfterTrailingData: true,
    };
  } finally {
    clearTimeout(readyTimer);
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise(resolvePromise => child.once('exit', resolvePromise));
      child.kill('SIGTERM');
      await Promise.race([exited, delay(1000)]);
    }
  }
  console.log(JSON.stringify(observed, null, 2));
});

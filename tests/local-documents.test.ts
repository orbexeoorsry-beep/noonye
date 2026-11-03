import { build } from 'esbuild';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localDocumentStore, LocalDocumentError, localDocumentErrorMessage } from '../src/services/local-document-store';
import { loadBookDocumentData } from '../src/features/book-viewer/document-source';

/** Runs against installed Chromium's real IndexedDB; never substitutes a memory mock. */
export async function runLocalDocumentTests(assert: (condition: boolean, description: string) => void) {
  for (const [label, operation] of [
    ['save', () => localDocumentStore.saveDocument('unavailable', 'PDF', 1, new Uint8Array([1]), 1)],
    ['load', () => localDocumentStore.getDocumentData('unavailable')],
    ['list', () => localDocumentStore.getAllDocuments()],
  ] as const) {
    let error: unknown;
    try { await operation(); } catch (caught) { error = caught; }
    assert(error instanceof LocalDocumentError && error.code === 'unavailable',
      `Unavailable IndexedDB explicitly rejects ${label}; no volatile fallback`);
  }
  let samples = 0;
  try {
    await loadBookDocumentData({ id: 'unavailable', source: 'local' },
      async () => { throw new LocalDocumentError('load'); }, () => { samples++; return new Uint8Array([1]); });
    assert(false, 'Storage load error must propagate');
  } catch (error) {
    assert(error instanceof LocalDocumentError && error.code === 'load' && samples === 0,
      'Storage load failure propagates without generating a substitute');
  }
  assert(localDocumentErrorMessage(new LocalDocumentError('missing'), true).includes('أعد رفع'),
    'Arabic missing-file message explains re-upload recovery');
  assert(localDocumentErrorMessage(new LocalDocumentError('quota'), false).includes('not saved'),
    'English quota message explicitly says changes were not saved');

  const bundled = await build({ entryPoints: ['tests/local-documents.browser.ts'], bundle: true,
    format: 'esm', platform: 'browser', write: false });
  const server = createServer((request, response) => {
    response.setHeader('Content-Type', request.url === '/tests.js' ? 'text/javascript' : 'text/html');
    response.end(request.url === '/tests.js' ? bundled.outputFiles[0].text : '<!doctype html><title>Persistence tests</title>');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server failed');
  const origin = `http://127.0.0.1:${address.port}`;
  const profile = await mkdtemp(join(tmpdir(), 'noon-persistence-'));
  const browser = spawn(process.env.CHROMIUM_BIN || 'chromium', ['--headless', '--no-sandbox',
    '--disable-gpu', '--disable-dev-shm-usage', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  let socket: WebSocket | undefined;
  try {
    const endpoint = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Chromium startup timeout')), 15000);
      let output = '';
      browser.stderr.on('data', (chunk) => {
        output += chunk.toString();
        const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      browser.on('error', (error) => { clearTimeout(timer); reject(error); });
      browser.on('exit', (code) => { clearTimeout(timer); reject(new Error(`Chromium exited: ${code}`)); });
    });
    const debugOrigin = endpoint.replace(/^ws:/, 'http:').split('/devtools/')[0];
    const target = await (await fetch(`${debugOrigin}/json/new?${encodeURIComponent(origin)}`, { method: 'PUT' })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
    let id = 0;
    socket.onmessage = (event) => {
      const result = JSON.parse(String(event.data));
      if (!result.id) return;
      const item = pending.get(result.id);
      pending.delete(result.id);
      if (result.error) item?.reject(new Error(JSON.stringify(result.error)));
      else item?.resolve(result.result);
    };
    await new Promise<void>((resolve, reject) => {
      socket!.onopen = () => resolve();
      socket!.onerror = () => reject(new Error('Chromium debug connection failed'));
    });
    const call = (method: string, params: object) => new Promise<any>((resolve, reject) => {
      const callId = ++id;
      pending.set(callId, { resolve, reject });
      socket!.send(JSON.stringify({ id: callId, method, params }));
    });
    const result = await Promise.race([
      call('Runtime.evaluate', { expression: `import('${origin}/tests.js').then(m => m.runBrowserTests())`,
        awaitPromise: true, returnByValue: true }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Browser tests timed out')), 20000).unref()),
    ]);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    if (!Array.isArray(result.result?.value)) throw new Error('Browser tests returned no results');
    for (const message of result.result.value) assert(true, message);
  } finally {
    socket?.close();
    browser.kill();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await new Promise<void>((resolve) => {
      if (browser.exitCode !== null) resolve();
      else browser.once('exit', () => resolve());
    });
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

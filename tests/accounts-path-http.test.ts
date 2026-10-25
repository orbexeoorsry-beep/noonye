import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import {
  copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, linkSync,
  rmSync, symlinkSync, writeFileSync, realpathSync,
} from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import * as net from 'node:net';
import { tmpdir } from 'node:os';
import { AccountStore } from '../server/features/accounts/store';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverBundle = path.join(repo, 'server.js');
const node = process.execPath;
const shellMarker = 'PHYSICAL_FIXTURE_SHELL_20261022';
const decoyMarker = 'FOREIGN_CWD_DECOY_20261022';
const dbMarker = 'SENSITIVE_SQLITE_MARKER_20261022';
const TEST_TMP = tmpdir();

interface Fixture {
  base: string; app: string; cwd: string; db: string; port: number;
}
async function fixture(): Promise<Fixture> {
  mkdirSync(TEST_TMP, { recursive: true });
  const base = mkdtempSync(path.join(TEST_TMP, 'http-'));
  const app = path.join(base, 'physical-app');
  const cwd = path.join(base, 'foreign-cwd');
  mkdirSync(path.join(app, 'dist'), { recursive: true });
  mkdirSync(path.join(app, 'public'), { recursive: true });
  mkdirSync(path.join(cwd, 'dist'), { recursive: true });
  copyFileSync(serverBundle, path.join(app, 'server.js'));
  symlinkSync(path.join(repo, 'node_modules'), path.join(app, 'node_modules'), 'dir');
  writeFileSync(path.join(app, 'dist', 'index.html'), `<!doctype html><title>${shellMarker}</title>`);
  writeFileSync(path.join(cwd, 'dist', 'index.html'), `<!doctype html><title>${decoyMarker}</title>`);
  return { base, app, cwd, db: path.join(base, 'private', 'accounts.sqlite'), port: await freePort() };
}
async function freePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = (server.address() as { port: number }).port;
  await new Promise<void>(resolve => server.close(() => resolve()));
  return port;
}
function envFor(f: Fixture, database: string, mode: 'development' | 'production' = 'production'): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: mode,
    PORT: String(f.port),
    NOON_ACCOUNTS_LOCAL: '1',
    NOON_LOCAL_ACCOUNTS_DB: database,
    NOON_LOCAL_ACCOUNTS_ORIGIN: `http://127.0.0.1:${f.port}`,
    TMPDIR: TEST_TMP,
  };
}
function launch(f: Fixture, database: string, args: string[] = [], mode: 'development' | 'production' = 'production'): ChildProcess {
  return spawn(node, [...args, path.join(f.app, 'server.js')], {
    cwd: f.cwd,
    env: envFor(f, database, mode),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
function childOutput(child: ChildProcess): () => string {
  let output = '';
  child.stdout?.setEncoding('utf8').on('data', (s: string) => { output += s; });
  child.stderr?.setEncoding('utf8').on('data', (s: string) => { output += s; });
  return () => output;
}
async function waitExit(child: ChildProcess, timeoutMs = 3500): Promise<{ code: number | null; output: string }> {
  const output = childOutput(child);
  const result = await new Promise<{ code: number | null }>((resolve, reject) => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`Child did not exit within ${timeoutMs}ms: ${output()}`)); }, timeoutMs);
    child.once('exit', code => { clearTimeout(timer); resolve({ code }); });
    child.once('error', error => { clearTimeout(timer); reject(error); });
  });
  return { ...result, output: output() };
}
async function stop(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.killed) return;
  child.kill('SIGTERM');
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      new Promise<void>((resolve) => child.once('exit', () => resolve())),
      new Promise<void>((_, reject) => { timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Server failed bounded shutdown')); }, 2500); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}
function get(port: number, requestPath: string): Promise<{ status: number; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port, method: 'GET', path: requestPath }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks) }));
    });
    req.setTimeout(1800, () => req.destroy(new Error('HTTP request timed out')));
    req.on('error', reject);
    req.end();
  });
}
async function waitForServer(child: ChildProcess, port: number): Promise<void> {
  const deadline = Date.now() + 4500;
  let lastError: unknown;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited before ready (${child.exitCode})`);
    try { const response = await get(port, '/api/health'); if (response.status > 0) return; } catch (error) { lastError = error; }
    await delay(40);
  }
  throw new Error(`Server did not become ready: ${String(lastError)}`);
}
function createMarkedDatabase(filename: string): void {
  mkdirSync(path.dirname(filename), { recursive: true });
  const store = new AccountStore(filename);
  const db = store.db;
  db.exec('CREATE TABLE evidence (marker TEXT);');
  db.prepare('INSERT INTO evidence VALUES (?)').run(dbMarker);
  store.close();
}
function clean(f: Fixture): void { rmSync(f.base, { recursive: true, force: true }); }

test('production local accounts rejects database paths inside physical application and traversal before listen', async () => {
  const f = await fixture();
  try {
    for (const candidate of [path.join(f.app, 'public', 'bad.sqlite'), path.join(f.app, 'dist', 'bad.sqlite'), `${f.app}/../../outside-traversal.sqlite`]) {
      const child = launch(f, candidate);
      const result = await waitExit(child);
      assert.notEqual(result.code, 0, `unsafe DB path unexpectedly started (${candidate}); output: ${result.output}`);
      assert.equal(existsSync(candidate), false, `unsafe DB path created database: ${candidate}`);
      assert.doesNotMatch(result.output, /Server running on port/);
    }
  } finally { clean(f); }
});

test('production local accounts rejects symlink ancestors and dangling final database symlinks before listen', async () => {
  const f = await fixture();
  try {
    const outside = path.join(f.base, 'outside'); mkdirSync(outside);
    const parentLink = path.join(f.base, 'parent-link'); symlinkSync(outside, parentLink, 'dir');
    const dangling = path.join(f.base, 'dangling.sqlite'); symlinkSync(path.join(f.base, 'missing-target.sqlite'), dangling);
    const externalAlias = path.join(outside, 'link.sqlite');
    symlinkSync(path.join(f.app, 'dist', 'synthetic.sqlite'), externalAlias);
    const existingTarget = path.join(f.app, 'dist', 'existing.sqlite');
    createMarkedDatabase(existingTarget);
    const existingAlias = path.join(outside, 'existing-link.sqlite'); symlinkSync(existingTarget, existingAlias);
    const targets = [path.join(parentLink, 'created.sqlite'), dangling, externalAlias, existingAlias];
    for (const candidate of targets) {
      const child = launch(f, candidate);
      const result = await waitExit(child);
      assert.notEqual(result.code, 0, `symlink DB path unexpectedly started (${candidate}); output: ${result.output}`);
      assert.doesNotMatch(result.output, /Server running on port/);
      assert.equal(existsSync(path.join(outside, 'created.sqlite')), false);
      assert.equal(lstatSync(dangling).isSymbolicLink(), true);
      assert.equal(existsSync(path.join(f.app, 'dist', 'synthetic.sqlite')), false);
    }
  } finally { clean(f); }
});

test('valid external DB uses physical app shell and blocks database links, traversal and /@fs on each request', async () => {
  const f = await fixture();
  createMarkedDatabase(f.db);
  const child = launch(f, f.db);
  try {
    await waitForServer(child, f.port);
    const accounts = await get(f.port, '/accounts');
    assert.equal(accounts.status, 200);
    assert.match(accounts.body.toString(), new RegExp(shellMarker));
    assert.doesNotMatch(accounts.body.toString(), new RegExp(decoyMarker));
    const status = await get(f.port, '/api/accounts/status');
    assert.equal(status.status, 200);
    assert.match(status.body.toString(), /enabled/);

    // Add links only after startup: request-time checks must catch file and directory aliases.
    symlinkSync(f.db, path.join(f.app, 'dist', 'arbitrary-name.bin'));
    symlinkSync(f.db, path.join(f.app, 'public', 'db-alias'), 'file');
    symlinkSync(path.dirname(f.db), path.join(f.app, 'public', 'dir-alias'), 'dir');
    copyFileSync(f.db, path.join(f.app, 'dist', 'synthetic.sqlite'));
    for (const name of ['synthetic.sqlite-wal', 'synthetic.sqlite-shm', 'synthetic.sqlite-journal']) {
      writeFileSync(path.join(f.app, 'dist', name), `SQLITE_FAMILY_SENTINEL:${name}`);
    }
    const paths = [
      '/arbitrary-name.bin', '/db-alias', '/dir-alias/accounts.sqlite',
      '/synthetic.sqlite', '/synthetic.sqlite-wal', '/synthetic.sqlite-shm', '/synthetic.sqlite-journal',
      '/SYNTHETIC.SQLITE', '/synthetic.SQLITE?download=1', '/synthetic.sqlite-wal?x=.txt', '/synthetic%2esqlite', '/synthetic%252esqlite',
      '/%2e%2e/private/accounts.sqlite', '/%2e%2e%2fprivate%2faccounts.sqlite',
      '/%2e%2e%5cprivate%5caccounts.sqlite', '/@fs' + f.db,
    ];
    for (const p of paths) {
      const response = await get(f.port, p);
      assert.equal(response.status, 404, `expected 404 for ${p}; got ${response.status}`);
      assert.equal(response.body.includes(Buffer.from('SQLite format 3')), false, `SQLite header leaked for ${p}`);
      assert.equal(response.body.includes(Buffer.from(dbMarker)), false, `database marker leaked for ${p}`);
    }
    for (const rawPath of ['/../private/accounts.sqlite', '/..\\private\\accounts.sqlite', '/arbitrary-name.bin#fragment', `http://127.0.0.1:${f.port}/arbitrary-name.bin`]) {
      const response = await get(f.port, rawPath);
      assert.equal(response.status, 404, `expected 404 for raw path ${rawPath}; got ${response.status}`);
      assert.equal(response.body.includes(Buffer.from(dbMarker)), false);
    }
  } finally {
    await stop(child);
    clean(f);
  }
});

test('symlinked production entry resolves security root to physical bundle, not foreign CWD', async () => {
  const f = await fixture();
  try {
    const linkDir = path.join(f.base, 'entry-alias'); mkdirSync(linkDir);
    symlinkSync(path.join(repo, 'node_modules'), path.join(linkDir, 'node_modules'), 'dir');
    const alias = path.join(linkDir, 'server.js'); symlinkSync(path.join(f.app, 'server.js'), alias);
    const inside = path.join(f.app, 'public', 'must-not-create.sqlite');
    const rejected = spawn(node, ['--preserve-symlinks-main', alias], { cwd: f.cwd, env: envFor(f, inside), stdio: ['ignore', 'pipe', 'pipe'] });
    const result = await waitExit(rejected);
    assert.notEqual(result.code, 0, `symlinked entry accepted database inside physical app: ${result.output}`);
    assert.equal(existsSync(inside), false);

    const externalDb = f.db;
    createMarkedDatabase(externalDb);
    const child = spawn(node, ['--preserve-symlinks-main', alias], { cwd: f.cwd, env: envFor(f, externalDb), stdio: ['ignore', 'pipe', 'pipe'] });
    try {
      await waitForServer(child, f.port);
      const response = await get(f.port, '/accounts');
      assert.equal(response.status, 200);
      assert.match(response.body.toString(), new RegExp(shellMarker));
      assert.doesNotMatch(response.body.toString(), new RegExp(decoyMarker));
    } finally { await stop(child); }
  } finally { clean(f); }
});

for (const mode of ['development', 'production'] as const) {
  test(`${mode} actual bundle denies SQLite aliases in public namespaces and Vite paths`, async () => {
    const f = await fixture();
    createMarkedDatabase(f.db);
    let walHandle: DatabaseSync | undefined;
    if (mode === 'development') {
      writeFileSync(path.join(f.app, 'package.json'), '{"type":"module"}');
      writeFileSync(path.join(f.app, 'index.html'), `<!doctype html><title>${shellMarker}</title>`);
      writeFileSync(path.join(f.app, 'vite.config.mjs'), `export default { cacheDir: ${JSON.stringify(path.join(f.base, 'vite-cache'))}, server: { hmr: false, watch: null } };`);
    }
    const child = launch(f, f.db, [], mode);
    try {
      await waitForServer(child, f.port);
      const accountPage = await get(f.port, '/accounts');
      assert.equal(accountPage.status, 200);
      assert.match(accountPage.body.toString(), new RegExp(shellMarker));
      const health = await get(f.port, '/api/health');
      assert.equal(health.status, 200);

      const vitePackage = realpathSync(createRequire(import.meta.url).resolve('vite/package.json'));
      const publicViteEnv = path.join(path.dirname(vitePackage), 'dist/client/env.mjs');
      const publicModule = await get(f.port, '/@fs' + publicViteEnv);
      assert.equal(publicModule.status, mode === 'development' ? 200 : 404, 'only the exact public Vite client module is allowed in dev');
      if (mode === 'development') assert.match(publicModule.body.toString(), /globalThis/);
      writeFileSync(path.join(f.app, '.env'), 'SYNTHETIC_ONLY_SECRET=not-a-real-secret');
      for (const forbidden of [vitePackage, path.join(f.app, '.env'), publicViteEnv + '.backup']) {
        const response = await get(f.port, '/@fs' + forbidden);
        assert.equal(response.status, 404, `no directory-wide @fs permission: ${forbidden}`);
        assert.equal(response.body.includes(Buffer.from('SYNTHETIC_ONLY_SECRET')), false);
      }

      // Required paths: separate namespace assertions with no credentials/cookies.
      symlinkSync(f.db, path.join(f.app, 'dist', 'alias.bin'));
      symlinkSync(f.db, path.join(f.app, 'public', 'alias.bin'));
      for (const p of ['/dist/alias.bin', '/public/alias.bin']) {
        const response = await get(f.port, p);
        assert.equal(response.status, 404, `${mode} ${p}: expected 404`);
        assert.equal(response.body.includes(Buffer.from('SQLite format 3')), false);
        assert.equal(response.body.includes(Buffer.from(dbMarker)), false);
      }

      const publicCopy = path.join(f.app, 'public', 'sqlite.png');
      const publicJs = path.join(f.app, 'public', 'sqlite.js');
      const publicBin = path.join(f.app, 'public', 'sqlite.bin');
      const srcCopy = path.join(f.app, 'src-sqlite.bin');
      for (const [source, destination] of [[f.db, publicCopy], [f.db, publicJs], [f.db, publicBin], [f.db, srcCopy]] as const) copyFileSync(source, destination);
      for (const extension of ['png', 'js', 'bin']) copyFileSync(f.db, path.join(f.app, 'dist', `sqlite.${extension}`));
      for (const directory of ['public', 'dist']) writeFileSync(path.join(f.app, directory, 'harmless.bin'), 'HARMLESS_STATIC_CONTROL');
      writeFileSync(path.join(f.app, 'harmless.bin'), 'HARMLESS_STATIC_CONTROL');
      const harmless = await get(f.port, '/harmless.bin');
      assert.equal(harmless.status, 200, `${mode}: benign static files must still work`);
      assert.equal(harmless.body.toString(), 'HARMLESS_STATIC_CONTROL');
      const raw = path.join(f.base, 'raw.db');
      const walDb = walHandle = new DatabaseSync(raw);
      walDb.exec('PRAGMA journal_mode=WAL; CREATE TABLE x(v); INSERT INTO x VALUES (1);');
      const sideAliases: string[] = [];
      for (const suffix of ['-wal', '-shm', '-journal']) {
        const sidecar = `${raw}${suffix}`;
        if (suffix === '-journal') writeFileSync(sidecar, 'SQLite synthetic journal marker');
        if (existsSync(sidecar)) {
          const alias = path.join(f.app, 'public', `sidecar-${suffix.slice(1)}.odd`);
          symlinkSync(sidecar, alias);
          sideAliases.push(`/public/${path.basename(alias)}`, `/${path.basename(alias)}`);
          if (suffix !== '-journal') {
            const copy = `copied-${suffix.slice(1)}.odd`;
            for (const directory of ['public', 'dist']) copyFileSync(sidecar, path.join(f.app, directory, copy));
            sideAliases.push(`/${copy}`);
          }
        }
      }
      // Same fixture filesystem: this synthetic sidecar deliberately has no format magic.
      // Its active database sidecar identity must block hard-linked aliases instead.
      const journal = f.db + '-journal'; writeFileSync(journal, 'SENSITIVE_SYNTHETIC_SIDECAR_WITHOUT_MAGIC');
      for (const directory of ['public', 'dist']) linkSync(journal, path.join(f.app, directory, 'hidden-sidecar.txt'));
      sideAliases.push('/hidden-sidecar.txt');
      for (const directory of ['public', 'dist']) linkSync(f.db, path.join(f.app, directory, 'hardlink.data'));
      sideAliases.push('/hardlink.data');

      const paths = [
        '/alias.bin', '/dist/alias.bin', '/public/alias.bin',
        '/sqlite.png', '/sqlite.js', '/sqlite.bin', '/public/sqlite.png', '/public/sqlite.js', '/public/sqlite.bin',
        '/sqlite.js?raw', '/sqlite.js?url', '/sqlite.bin?import', '/s%71lite.png',
        '/src-sqlite.bin', '/@fs' + srcCopy,
        '/dist/alias.bin?raw', '/dist/alias.bin?url', '/dist/alias.bin?import',
        '/public/alias.bin?raw', '/public/alias.bin?url', '/public/alias.bin?import',
        '/%64ist/alias.bin', '/public%2falias.bin', '/dist%2Falias.bin',
        '/%2e%2e/private/accounts.sqlite', '/%2e%2e%2fprivate%2faccounts.sqlite', '/%2e%2e%5cprivate%5caccounts.sqlite',
        '/@fs' + f.db, ...sideAliases,
      ];
      for (const p of paths) {
        const response = await get(f.port, p);
        assert.equal(response.status, 404, `${mode} ${p}: expected 404, received ${response.status}`);
        assert.equal(response.body.includes(Buffer.from('SQLite format 3')), false, `${mode} ${p}: SQLite header leaked`);
        assert.equal(response.body.includes(Buffer.from(dbMarker)), false, `${mode} ${p}: DB marker leaked`);
      }
    } finally { walHandle?.close(); await stop(child); clean(f); }
  });
}

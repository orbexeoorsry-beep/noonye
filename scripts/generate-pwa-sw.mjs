import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve('dist');
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.webmanifest'), 'utf8'));
// Explicit build outputs only. Never crawl public/ or cache runtime responses.
const candidates = ['/', '/manifest.webmanifest', ...manifest.icons.map(i => i.src)];
const index = await readFile(path.join(root, 'index.html'), 'utf8');
for (const [, url] of index.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)) candidates.push(url);
// Vite can emit worker modules/chunks not linked directly from HTML.
for (const name of await readdir(path.join(root, 'assets'))) {
  if (!/\.(?:js|mjs)$/.test(name)) continue;
  const code = await readFile(path.join(root, 'assets', name), 'utf8');
  for (const [, url] of code.matchAll(/(\/assets\/[A-Za-z0-9._-]+\.(?:mjs|js|css))/g)) candidates.push(url);
}
const paths = [...new Set(candidates)].sort();
const contentHash = createHash('sha256').update(JSON.stringify(paths));
// A policy-only SW update must never write/delete the active release's cache.
contentHash.update(await readFile(fileURLToPath(import.meta.url)));
const integrity = {};
for (const url of paths) {
  if (!(url === '/' || url === '/manifest.webmanifest' || /^\/icons\/[A-Za-z0-9_-]+\.png$/.test(url) || /^\/assets\/[A-Za-z0-9._-]+\.(?:js|mjs|css)$/.test(url))) throw new Error(`Unsafe PWA asset: ${url}`);
  const bytes = await readFile(url === '/' ? path.join(root, 'index.html') : path.join(root, url.slice(1)));
  if (!bytes.length) throw new Error(`Empty app asset: ${url}`);
  contentHash.update(bytes);
  integrity[url] = `sha256-${createHash('sha256').update(bytes).digest('base64')}`;
}
const version = `noon-shell-${contentHash.digest('hex').slice(0,16)}`;
const sw = `// Generated from immutable static build outputs. Never edit by hand.
const CACHE=${JSON.stringify(version)};
const ALLOWLIST=${JSON.stringify(paths)};
const INTEGRITY=${JSON.stringify(integrity)};
const SAFE=new Set(ALLOWLIST);
const ownPrefix='noon-shell-';
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  try {
    for (const url of ALLOWLIST) {
      // No cookies; integrity prevents caching redirects, login HTML or personalized responses.
      const response = await fetch(url, { cache:'reload', credentials:'omit', integrity:INTEGRITY[url], redirect:'error' });
      if (!response.ok || response.type === 'opaque') throw new Error('Static shell fetch failed');
      await cache.put(url, response);
    }
  } catch (error) {
    await caches.delete(CACHE);
    throw error;
  }
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) {
    if (name.startsWith(ownPrefix) && name !== CACHE) await caches.delete(name);
  }
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.has('authorization') || request.headers.has('range')) return;
  // Fragments are not sent in HTTP requests. Hash-based UI uses the same static shell.
  if (url.search || !SAFE.has(url.pathname)) return;
  if (request.mode === 'navigate' && url.pathname !== '/') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // No runtime cache writes: a miss goes to the network without being stored.
    return await cache.match(url.pathname) || fetch(request);
  })());
});
`;
await writeFile(path.join(root, 'sw.js'), sw);
console.log(`Generated ${version} with ${paths.length} integrity-checked static assets`);

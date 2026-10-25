import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
const root = path.resolve(process.argv[2] || 'dist');
const port = Number(process.env.PORT || 4187);
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.png':'image/png', '.webmanifest':'application/manifest+json', '.json':'application/json', '.svg':'image/svg+xml', '.woff2':'font/woff2' };
http.createServer(async (req,res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.split('/').some(x => x.startsWith('.') || x === '..') || pathname.includes('\\')) throw Error('Invalid path');
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) throw Error('Invalid path');
    if (!(await stat(file)).isFile()) throw Error('Not a file');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'Content-Security-Policy': "frame-ancestors 'none'", ...(pathname === '/sw.js' ? { 'Service-Worker-Allowed':'/' } : {}) });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404, { 'Cache-Control':'no-store' }); res.end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log(`Isolated static PWA preview on port ${port}; root ${root}`));

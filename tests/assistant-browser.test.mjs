import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const port = 43000 + Math.floor(Math.random() * 10000);
const server = spawn('node_modules/.bin/tsx', ['server.ts'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), NODE_ENV: 'development' }, stdio: 'ignore' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/`); if (r.ok) { ready = true; break; } } catch {} await new Promise(r => setTimeout(r, 100)); }
  assert.ok(ready, 'local app did not become ready');
  browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const explainRequests = [];
  page.on('request', request => { if (request.url().includes('/api/assistant/explain')) explainRequests.push(request.url()); });
  await page.goto(`http://127.0.0.1:${port}/`);
  const result = await page.evaluate(async () => {
    const { aiGateway } = await import('/src/services/aiGateway.ts');
    const originalFetch = window.fetch;
    let fetchCalls = 0;
    window.fetch = (...args) => { fetchCalls++; return originalFetch(...args); };
    const common = { pageNumber: 2, selectionType: 'text', language: 'en', bookTitle: 'Synthetic book', lessonTitle: 'Synthetic lesson', lessonContext: 'Synthetic lesson context', studentLevel: 'Synthetic level' };
    const textResponse = await aiGateway.execute('explain', { ...common, selectedText: 'Synthetic question' });
    const imageResponse = await aiGateway.execute('explainImage', { ...common, selectedImage: 'data:image/png;base64,c3ludGhldGlj', selectionType: 'image' });
    window.fetch = originalFetch;
    return { fetchCalls, textSuccess: textResponse.success, imageSuccess: imageResponse.success };
  });
  assert.deepEqual(result, { fetchCalls: 0, textSuccess: false, imageSuccess: false });
  assert.equal(explainRequests.length, 0);
  console.log('PASS: Chromium client with synthetic text/image/book/lesson/level; zero browser fetches and zero /api/assistant/explain requests');
} finally { await browser?.close(); server.kill('SIGTERM'); }

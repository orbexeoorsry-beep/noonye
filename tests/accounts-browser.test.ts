import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, type Browser, type BrowserContext } from 'playwright-core';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { AccountStore } from '../server/features/accounts/store';
import { ClassroomStore } from '../server/features/classrooms/store';

test('real browser: persisted classroom completion, lost response retry, independent session and shared-device logout', { timeout: 90000 }, async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'noon-accounts-browser-'));
  const database = path.join(directory, 'accounts.sqlite');
  let browser: Browser | undefined, child: ChildProcess | undefined;
  let logs = '';
  const probe = createServer(); await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>(resolve => probe.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`;
  const password = 'synthetic-browser-password';
  const seed = new AccountStore(database), rooms = new ClassroomStore(seed);
  const school = await seed.bootstrapSchool('browser-school', 'مدرسة اختبار مصطنعة', 'browser-admin', password, 'مدير مصطنع');
  const admin = await seed.login('browser-school', 'browser-admin', password);
  const classroom = rooms.createClass(admin, school.schoolId, { name: 'فصل اختبار مصطنع' });
  const teacherInvite = rooms.createInvitation(admin, classroom.id, { role: 'teacher' });
  const studentInvite = rooms.createInvitation(admin, classroom.id, { role: 'student' });
  await rooms.acceptInvitation({ token: teacherInvite.token, username: 'browser-teacher', password, displayName: 'معلم مصطنع' });
  const student = await rooms.acceptInvitation({ token: studentInvite.token, username: 'browser-student', password, displayName: 'طالب مصطنع' });
  const teacher = await seed.login('browser-school', 'browser-teacher', password);
  const reading = rooms.createReading(teacher, classroom.id, { title: 'قراءة اختبار مصطنعة', pagesFrom: 2, pagesTo: 4 });
  seed.close();
  async function start() {
    child = spawn(process.execPath, ['server.js'], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'production', PORT: String(port), NOON_ACCOUNTS_LOCAL: '1', NOON_LOCAL_ACCOUNTS_DB: database, NOON_LOCAL_ACCOUNTS_ORIGIN: origin }, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout!.on('data', data => logs += data); child.stderr!.on('data', data => logs += data);
    for (let n = 0; n < 100; n++) {
      try { if ((await fetch(`${origin}/api/health`)).ok) return; } catch { /* startup */ }
      if (child.exitCode !== null) throw new Error(`Server startup failed: ${logs}`);
      await new Promise(resolve => setTimeout(resolve, 75));
    }
    throw new Error(`Server not ready: ${logs}`);
  }
  async function stop() {
    const current = child;
    if (!current || current.exitCode !== null) return;
    await new Promise<void>(resolve => {
      const timer = setTimeout(() => current.kill('SIGKILL'), 2500);
      current.once('exit', () => { clearTimeout(timer); resolve(); }); current.kill('SIGTERM');
    });
  }
  const outbound: string[] = [];
  async function context() {
    const ctx = await browser!.newContext();
    await ctx.route('**/*', route => {
      if (new URL(route.request().url()).origin !== origin) { outbound.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    return ctx;
  }
  async function signIn(ctx: BrowserContext, username: string) {
    const page = await ctx.newPage();
    const navigation = await page.goto(`${origin}/accounts`);
    const csp = navigation!.headers()['content-security-policy'];
    assert.equal(csp.split(';').map(x => x.trim()).find(x => x.startsWith('script-src ')), "script-src 'self'");
    const result = await page.evaluate(async ({ username, password }) => {
      const response = await fetch('/api/accounts/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schoolSlug: 'browser-school', username, password }) });
      return response.status;
    }, { username, password });
    assert.equal(result, 200);
    await page.reload();
    await page.getByTestId('accounts-workspace').waitFor();
    const inlineExecuted = await page.evaluate(() => {
      const script = document.createElement('script');
      script.textContent = 'globalThis.__noonSyntheticInlineProbe = true';
      document.head.appendChild(script);
      script.remove();
      return '__noonSyntheticInlineProbe' in globalThis;
    });
    assert.equal(inlineExecuted, false, 'production CSP must block inline script execution');
    return page;
  }
  try {
    await start();
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const ctx = await context();
    const page = await signIn(ctx, 'browser-student');
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    assert.equal(await page.getByTestId('accounts-workspace').getAttribute('data-role'), 'student');
    await page.getByTestId('class-selector').selectOption(classroom.id);
    const card = page.locator(`[data-reading-id="${reading.id}"]`);
    await card.waitFor();
    let attempts = 0; const bodies: string[] = [];
    await page.route(`**/api/readings/${reading.id}/completion`, async route => {
      attempts++; bodies.push(route.request().postData() || '');
      if (attempts === 1) { await route.fetch(); await route.abort('failed'); }
      else await route.continue();
    });
    await card.getByTestId('completion-button').click();
    await page.waitForFunction(id => {
      const card = document.querySelector(`[data-reading-id="${id}"]`);
      const text = card?.querySelector('[data-testid="completion-status"]')?.textContent || '';
      return /فشل|تعذر|محاولة/.test(text);
    }, reading.id);
    await card.getByTestId('completion-button').click();
    await card.getByTestId('completion-status').filter({ hasText: 'محفوظ' }).waitFor();
    assert.equal(attempts, 2); assert.equal(bodies[0], bodies[1], 'retry must reuse the same submission key');
    const inspection = new AccountStore(database);
    assert.equal((inspection.db.prepare('SELECT COUNT(*) AS count FROM completions').get() as {count:number}).count, 1);
    inspection.close();
    const deviceTwo = await context();
    const second = await signIn(deviceTwo, 'browser-student');
    await second.getByTestId('class-selector').selectOption(classroom.id);
    await second.locator(`[data-reading-id="${reading.id}"]`).getByTestId('completion-status').filter({ hasText: 'محفوظ' }).waitFor();
    // Process restart preserves the database, not just component state or a module-level Map.
    await stop(); await start(); await second.reload();
    await second.getByTestId('class-selector').selectOption(classroom.id);
    await second.locator(`[data-reading-id="${reading.id}"]`).getByTestId('completion-status').filter({ hasText: 'محفوظ' }).waitFor();
    await page.getByTestId('logout-button').click();
    await page.getByTestId('accounts-workspace').waitFor({ state: 'detached' });
    assert.ok(!(await page.locator('body').innerText()).includes('طالب مصطنع'));
    // The next account on the same browser context must get a clean private workspace.
    await page.close();
    const teacherPage = await signIn(ctx, 'browser-teacher');
    assert.equal(await teacherPage.getByTestId('accounts-workspace').getAttribute('data-role'), 'teacher');
    await teacherPage.getByTestId('class-selector').selectOption(classroom.id);
    await teacherPage.locator(`[data-reading-id="${reading.id}"]`).waitFor();
    const history = await teacherPage.evaluate(async id => (await fetch(`/api/readings/${id}/completions`)).json(), reading.id);
    assert.equal(history.completions.length, 1); assert.equal(history.completions[0].studentId, student.id);
    assert.deepEqual(errors, []);
    assert.deepEqual(outbound, [], 'account page must not attempt any external requests');
    assert.ok(!logs.includes(password) && !logs.includes(studentInvite.token));
  } finally {
    await browser?.close(); await stop(); rmSync(directory, { recursive: true, force: true });
  }
});

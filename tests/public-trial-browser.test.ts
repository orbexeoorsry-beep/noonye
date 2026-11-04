import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium, type Browser } from 'playwright-core';
import { AccountStore } from '../server/features/accounts/store.js';
import { ClassroomStore } from '../server/features/classrooms/store.js';

test('public trial browser: select existing roles without passwords and keep the local library locked', { timeout: 90000 }, async () => {
  const directory = mkdtempSync('/dev/shm/noon-public-trial-browser-');
  const database = path.join(directory, 'synthetic.sqlite');
  const password = 'synthetic-public-browser-password';
  const seed = new AccountStore(database);
  const classrooms = new ClassroomStore(seed);
  const school = await seed.bootstrapSchool('public-browser-school', 'مدرسة اصطناعية للمتصفح', 'public-browser-admin', password, 'مدير اصطناعي');
  const adminToken = await seed.login('public-browser-school', 'public-browser-admin', password);
  const classroom = classrooms.createClass(adminToken, school.schoolId, { name: 'فصل اصطناعي للمتصفح' });
  const teacherInvite = classrooms.createInvitation(adminToken, classroom.id, { role: 'teacher' });
  const studentInvite = classrooms.createInvitation(adminToken, classroom.id, { role: 'student' });
  const teacher = await classrooms.acceptInvitation({ token: teacherInvite.token, username: 'public-browser-teacher', password, displayName: 'معلّم اصطناعي للمتصفح' });
  const student = await classrooms.acceptInvitation({ token: studentInvite.token, username: 'public-browser-student', password, displayName: 'طالب اصطناعي للمتصفح' });
  const adminId = seed.identity(adminToken).user.id;
  seed.close();

  const probe = createServer();
  await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>(resolve => probe.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`;
  let child: ChildProcess | undefined;
  let browser: Browser | undefined;
  let logs = '';
  const outbound: string[] = [];

  async function start() {
    child = spawn(process.execPath, ['dist/server.js'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(port),
        NOON_ACCOUNTS_LOCAL: '1',
        NOON_LOCAL_ACCOUNTS_DB: database,
        NOON_LOCAL_ACCOUNTS_ORIGIN: origin,
        NOON_PUBLIC_TRIAL: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout!.on('data', data => logs += data);
    child.stderr!.on('data', data => logs += data);
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if ((await fetch(`${origin}/api/health`)).ok) return; } catch { /* server startup */ }
      if (child.exitCode !== null) throw new Error(`Synthetic browser server failed: ${logs}`);
      await new Promise(resolve => setTimeout(resolve, 75));
    }
    throw new Error(`Synthetic browser server did not become ready: ${logs}`);
  }

  async function stop() {
    const current = child;
    if (!current || current.exitCode !== null) return;
    await new Promise<void>(resolve => {
      const timer = setTimeout(() => current.kill('SIGKILL'), 2500);
      current.once('exit', () => { clearTimeout(timer); resolve(); });
      current.kill('SIGTERM');
    });
  }

  try {
    await start();
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const context = await browser.newContext({ locale: 'ar', serviceWorkers: 'block' });
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin !== origin) { outbound.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    await page.goto(`${origin}/accounts`);
    await page.getByTestId('public-trial-picker').waitFor();
    assert.match(await page.locator('body').innerText(), /التجربة العامة مفتوحة/);
    await page.getByTestId(`public-trial-account-${adminId}`).click();
    await page.getByTestId('admin-dashboard').waitFor();
    assert.equal(await page.getByTestId('accounts-workspace').getAttribute('data-role'), 'school_admin');
    assert.deepEqual(outbound, [], 'the public accounts page makes no outbound browser requests');

    await page.goto(`${origin}/`);
    await page.getByRole('heading', { name: 'المكتبة مقفلة' }).waitFor();
    assert.equal(await page.getByTestId('public-trial-picker').count(), 0);

    outbound.length = 0; // Ignore the separate root page's pre-existing external font link.
    await page.goto(`${origin}/accounts`);
    await page.getByTestId('accounts-workspace').waitFor();
    await page.getByTestId(`public-trial-account-${teacher.id}`).click();
    await page.getByTestId('teacher-dashboard').waitFor();
    assert.equal(await page.getByTestId('accounts-workspace').getAttribute('data-role'), 'teacher');
    await page.getByTestId(`public-trial-account-${student.id}`).click();
    await page.getByTestId('student-dashboard').waitFor();
    assert.equal(await page.getByTestId('accounts-workspace').getAttribute('data-role'), 'student');
    assert.deepEqual(outbound, [], 'public trial pages make no outbound browser requests');
  } finally {
    await browser?.close();
    await stop();
    rmSync(directory, { recursive: true, force: true });
  }
});

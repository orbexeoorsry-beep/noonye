import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import { AccountStore } from '../server/features/accounts/store.js';
import { createAccountsRouter } from '../server/features/accounts/router.js';

test('accounts HTTP slice: auth, memberships, classes, invitations, readings, completions, persistence', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'noon-accounts-test-'));
  const database = path.join(directory, 'accounts.sqlite');
  let store = new AccountStore(database);
  let server: ReturnType<ReturnType<typeof express>['listen']> | undefined;
  try {
    const school = await store.bootstrapSchool('cedar-school', 'Cedar School', 'cedar-admin', 'admin-password-test', 'Cedar Admin');
    const otherSchool = await store.bootstrapSchool('maple-school', 'Maple School', 'maple-admin', 'other-password-test', 'Maple Admin');
    // Find an unused loopback port, then mount with its exact Host/Origin before issuing requests.
    const probe = express().listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => { probe.once('listening', resolve); probe.once('error', reject); });
    const address = probe.address();
    assert.ok(address && typeof address !== 'string');
    const port = address.port;
    await new Promise<void>(resolve => probe.close(() => resolve()));
    const origin = `http://127.0.0.1:${port}`;
    const mount = async () => {
      const app = express();
      app.use('/api', createAccountsRouter({ store, origin, enabled: true }));
      server = app.listen(port, '127.0.0.1');
      await new Promise<void>((resolve, reject) => { server!.once('listening', resolve); server!.once('error', reject); });
    };
    await mount();
    const request = (route: string, init: RequestInit = {}) => fetch(`${origin}/api${route}`, init);
    const get = async (route: string, init: RequestInit = {}) => {
      assert.equal(init.method === undefined || init.method === 'GET', true, 'bounded retry helper is GET-only');
      const deadline = Date.now() + 3000;
      for (let attempt = 0; ; attempt++) {
        try { return await request(route, { ...init, method: 'GET' }); }
        catch (error) {
          let current: any = error;
          let transport = false;
          for (let depth = 0; current && depth < 5; depth++, current = current.cause) {
            if (['UND_ERR_SOCKET', 'ECONNRESET', 'ECONNREFUSED'].includes(current.code)) transport = true;
          }
          if (!transport || attempt >= 5 || Date.now() >= deadline) throw error;
          await new Promise(resolve => setTimeout(resolve, Math.min(100, Math.max(1, deadline - Date.now()))));
        }
      }
    };
    const ready = async (headers?: HeadersInit) => {
      const response = await get('/accounts/status', { headers });
      assert.equal(response.status, 200);
      await response.arrayBuffer();
    };
    await ready();
    const json = (value: unknown) => ({ headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) });
    const login = async (schoolSlug: string, username: string, password: string) => {
      const response = await request('/accounts/login', { method: 'POST', ...json({ schoolSlug, username, password }), headers: { ...json({ schoolSlug, username, password }).headers, Origin: origin } });
      const payload = await response.json() as any;
      const setCookie = response.headers.get('set-cookie');
      assert.ok(setCookie?.includes('noon_local_session='));
      assert.match(setCookie!, /HttpOnly/i);
      assert.match(setCookie!, /SameSite=Strict/i);
      assert.match(setCookie!, /Path=\/api/i);
      return { response, payload, cookie: setCookie!.split(';')[0] };
    };
    const authHeaders = (cookie: string, csrf?: string) => ({ Cookie: cookie, Origin: origin, ...(csrf ? { 'x-csrf-token': csrf } : {}) });

    assert.equal((await request('/accounts/me')).status, 401);
    const adminLogin = await login('cedar-school', 'cedar-admin', 'admin-password-test');
    assert.equal(adminLogin.response.status, 200);
    assert.equal(adminLogin.payload.role, 'school_admin');
    assert.equal((await request('/accounts/login', { method: 'POST', ...json({ schoolSlug: 'cedar-school', username: 'cedar-admin', password: 'admin-password-test' }), headers: { ...json({}).headers, Origin: 'http://evil.example' } })).status, 403);
    assert.equal((await request('/accounts/login', { method: 'POST', headers: { 'content-type': 'application/json', Origin: origin }, body: '{' })).status, 400);
    assert.equal((await request('/accounts/login', { method: 'POST', headers: { 'content-type': 'application/json', Origin: origin }, body: JSON.stringify({ schoolSlug: 'cedar-school', username: 'cedar-admin', password: 'x'.repeat(8200) }) })).status, 413);
    const adminCookie = adminLogin.cookie;
    const adminCsrf = adminLogin.payload.csrfToken as string;
    assert.equal((await request('/accounts/me', { headers: authHeaders(adminCookie) })).status, 200);
    assert.equal((await request('/accounts/logout', { method: 'POST', headers: authHeaders(adminCookie) })).status, 403);

    const forbiddenPromotion = await request(`/schools/${school.schoolId}/members`, {
      method: 'POST', ...json({ username: 'spoof-admin', password: 'spoof-password-long', displayName: 'Spoof', role: 'school_admin' }), headers: { ...authHeaders(adminCookie, adminCsrf), ...json({}).headers },
    });
    assert.equal(forbiddenPromotion.status, 400);
    const directTeacher = await request(`/schools/${school.schoolId}/members`, {
      method: 'POST', ...json({ username: 'direct-teacher', password: 'direct-teacher-password', displayName: 'Direct Teacher', role: 'teacher' }), headers: { ...authHeaders(adminCookie, adminCsrf), ...json({}).headers },
    });
    assert.equal(directTeacher.status, 201);
    assert.equal((await directTeacher.json() as any).member.username, 'direct-teacher');
    assert.equal((await request(`/schools/${school.schoolId}/members`, { headers: authHeaders(adminCookie) })).status, 200);
    assert.equal((await request(`/schools/${otherSchool.schoolId}/members`, { headers: authHeaders(adminCookie) })).status, 403);

    const createClass = async (schoolId: string, name: string) => {
      const response = await request(`/schools/${schoolId}/classes`, { method: 'POST', ...json({ name }), headers: { ...authHeaders(adminCookie, adminCsrf), ...json({}).headers } });
      assert.equal(response.status, 201);
      return (await response.json() as any).classroom;
    };
    const classOne = await createClass(school.schoolId, 'Cedar One');
    const classTwo = await createClass(school.schoolId, 'Cedar Two');
    const otherSchoolLogin = await login('maple-school', 'maple-admin', 'other-password-test');
    const otherOriginAdmin = otherSchoolLogin.cookie;
    const otherClassResponse = await request(`/schools/${otherSchool.schoolId}/classes`, {
      method: 'POST', ...json({ name: 'Maple One' }), headers: { ...authHeaders(otherOriginAdmin, otherSchoolLogin.payload.csrfToken), ...json({}).headers },
    });
    assert.equal(otherClassResponse.status, 201);
    const otherClass = (await otherClassResponse.json() as any).classroom;
    const classList = await request(`/schools/${school.schoolId}/classes`, { headers: authHeaders(adminCookie) });
    assert.equal(classList.status, 200);
    assert.equal((await classList.json() as any).classes.length, 2);

    const invite = async (classId: string, role: 'teacher' | 'student') => {
      const response = await request(`/classes/${classId}/invitations`, { method: 'POST', ...json({ role }), headers: { ...authHeaders(adminCookie, adminCsrf), ...json({}).headers } });
      assert.equal(response.status, 201);
      const data = await response.json() as any;
      assert.equal(data.role, role);
      assert.equal(data.classId, classId);
      assert.equal(typeof data.expiresAt, 'number');
      assert.equal(typeof data.token, 'string');
      return data.token as string;
    };
    const teacherInvite = await invite(classOne.id, 'teacher');
    const studentInvite = await invite(classOne.id, 'student');
    const studentTwoInvite = await invite(classOne.id, 'student');
    const isolatedInvite = await invite(classTwo.id, 'teacher');
    const invalidRoleInvite = await request(`/classes/${classOne.id}/invitations`, { method: 'POST', ...json({ role: 'school_admin' }), headers: { ...authHeaders(adminCookie, adminCsrf), ...json({}).headers } });
    assert.equal(invalidRoleInvite.status, 400);

    const accept = async (token: string, username: string, extras = {}) => request('/accounts/accept-invite', {
      method: 'POST', ...json({ token, username, password: `${username}-password-long`, displayName: username, ...extras }), headers: { ...json({}).headers, Origin: origin },
    });
    const teacherAccept = await accept(teacherInvite, 'invited-teacher');
    assert.equal(teacherAccept.status, 201);
    const teacher = (await teacherAccept.json() as any).member;
    assert.equal(teacher.role, 'teacher');
    const reuseInvite = await accept(teacherInvite, 'reused-teacher');
    assert.equal(reuseInvite.status, 410);
    const studentAccept = await accept(studentInvite, 'invited-student');
    assert.equal(studentAccept.status, 201);
    const student = (await studentAccept.json() as any).member;
    assert.equal(student.role, 'student');
    const studentTwoAccept = await accept(studentTwoInvite, 'invited-student-two');
    assert.equal(studentTwoAccept.status, 201);
    const studentTwo = (await studentTwoAccept.json() as any).member;
    const isolatedTeacherAccept = await accept(isolatedInvite, 'isolated-teacher');
    assert.equal(isolatedTeacherAccept.status, 201);
    const isolatedTeacher = (await isolatedTeacherAccept.json() as any).member;
    assert.equal(isolatedTeacher.role, 'teacher');
    assert.equal((await accept(isolatedInvite, 'isolated-teacher', { classId: classOne.id })).status, 400);

    const teacherLogin = await login('cedar-school', 'invited-teacher', 'invited-teacher-password-long');
    const studentLogin = await login('cedar-school', 'invited-student', 'invited-student-password-long');
    const teacherCookie = teacherLogin.cookie;
    const teacherCsrf = teacherLogin.payload.csrfToken as string;
    const studentCookie = studentLogin.cookie;
    const studentCsrf = studentLogin.payload.csrfToken as string;
    const teacherClassesResponse = await request('/accounts/classes', { headers: authHeaders(teacherCookie) });
    assert.equal(teacherClassesResponse.status, 200);
    assert.deepEqual((await teacherClassesResponse.json() as any).classes.map((c: any) => c.id), [classOne.id]);
    const studentClassesResponse = await request('/accounts/classes', { headers: authHeaders(studentCookie) });
    assert.equal(studentClassesResponse.status, 200);
    assert.deepEqual((await studentClassesResponse.json() as any).classes.map((c: any) => c.id), [classOne.id]);
    assert.equal((await request(`/classes/${classTwo.id}/readings`, { headers: authHeaders(teacherCookie) })).status, 403);
    assert.equal((await request(`/classes/${classOne.id}/readings`, { headers: authHeaders(adminCookie) })).status, 200);
    assert.equal((await request(`/classes/${otherClass.id}/readings`, { headers: authHeaders(teacherCookie) })).status, 403);

    const readingResponse = await request(`/classes/${classOne.id}/readings`, {
      method: 'POST', ...json({ title: 'Seedling Notes', pagesFrom: 4, pagesTo: 9 }), headers: { ...authHeaders(teacherCookie, teacherCsrf), ...json({}).headers },
    });
    assert.equal(readingResponse.status, 201);
    const reading = (await readingResponse.json() as any).reading;
    assert.equal(reading.classId, classOne.id);
    assert.equal(reading.title, 'Seedling Notes');
    assert.equal(reading.pagesFrom, 4);
    assert.equal(reading.pagesTo, 9);
    assert.equal(typeof reading.createdAt, 'number');
    const invalidReading = await request(`/classes/${classOne.id}/readings`, {
      method: 'POST', ...json({ title: 'Bad', pagesFrom: 10, pagesTo: 2, studentId: student.id }), headers: { ...authHeaders(teacherCookie, teacherCsrf), ...json({}).headers },
    });
    assert.equal(invalidReading.status, 400);
    const visibleReadings = await request(`/classes/${classOne.id}/readings`, { headers: authHeaders(studentCookie) });
    assert.equal(visibleReadings.status, 200);
    assert.ok((await visibleReadings.json() as any).readings.some((r: any) => r.id === reading.id));

    const completionPath = `/readings/${reading.id}/completion`;
    const submitCompletion = (cookie: string, csrf: string, submissionId: string, extra = {}) => request(completionPath, {
      method: 'POST', ...json({ submissionId, ...extra }), headers: { ...authHeaders(cookie, csrf), ...json({}).headers },
    });
    const submissionId = '0abf7e3a-b92a-42b8-9181-9fcf0c042d67';
    const completionResponse = await submitCompletion(studentCookie, studentCsrf, submissionId);
    assert.equal(completionResponse.status, 201);
    const completion = (await completionResponse.json() as any).completion;
    assert.equal(completion.readingId, reading.id);
    assert.equal(completion.studentId, student.id);
    const studentTwoLogin = await login('cedar-school', 'invited-student-two', 'invited-student-two-password-long');
    const studentTwoCompletions = await request(`/readings/${reading.id}/completions`, { headers: authHeaders(studentTwoLogin.cookie) });
    assert.equal(studentTwoCompletions.status, 200);
    assert.equal((await studentTwoCompletions.json() as any).completions.some((item: any) => item.studentId === student.id), false);
    const studentTwoCsrf = studentTwoLogin.payload.csrfToken as string;
    const studentTwoCompletion = await submitCompletion(studentTwoLogin.cookie, studentTwoCsrf, '091bc7e4-6ee7-4bd6-9baa-8b483a572931');
    assert.equal(studentTwoCompletion.status, 201);
    assert.equal((await studentTwoCompletion.json() as any).completion.studentId, studentTwo.id);
    assert.equal((await submitCompletion(studentTwoLogin.cookie, studentTwoCsrf, 'a2b32c8c-83ed-45b0-a1c3-d59d56c98677', { studentId: student.id })).status, 400);
    assert.equal(typeof completion.completedAt, 'number');
    const otherKeyReplay = await submitCompletion(studentCookie, studentCsrf, '8de15ff2-97b8-4823-b2c8-9dd5c38df987');
    assert.equal(otherKeyReplay.status, 200);
    assert.deepEqual((await otherKeyReplay.json() as any).completion, completion);
    assert.equal((await submitCompletion(studentCookie, studentCsrf, submissionId, { studentId: 'spoof-id', classId: classTwo.id })).status, 400);
    assert.equal((await submitCompletion(teacherCookie, teacherCsrf, submissionId)).status, 403);
    assert.equal((await request(`/readings/${reading.id}/completions`, { headers: authHeaders(studentCookie) })).status, 200);
    assert.equal((await request(`/readings/${reading.id}/completions`, { headers: authHeaders(teacherCookie) })).status, 200);
    assert.equal((await request(`/readings/${reading.id}/completions`, { headers: authHeaders(adminCookie) })).status, 200);
    const secondTeacherLogin = await login('cedar-school', 'direct-teacher', 'direct-teacher-password');
    const secondTeacherClasses = await request('/accounts/classes', { headers: authHeaders(secondTeacherLogin.cookie) });
    assert.deepEqual((await secondTeacherClasses.json() as any).classes, []);
    assert.equal((await request(`/readings/${reading.id}/completions`, { headers: authHeaders(secondTeacherLogin.cookie) })).status, 403);
    assert.equal((await request(`/readings/${reading.id}/completions`, { headers: authHeaders(otherSchoolLogin.cookie) })).status, 403);
    const isolatedTeacherLogin = await login('cedar-school', 'isolated-teacher', 'isolated-teacher-password-long');
    assert.equal((await request('/accounts/classes', { headers: authHeaders(isolatedTeacherLogin.cookie) })).status, 200);
    assert.deepEqual((await (await request('/accounts/classes', { headers: authHeaders(isolatedTeacherLogin.cookie) })).json() as any).classes.map((c: any) => c.id), [classTwo.id]);
    assert.equal((await request(`/classes/${classOne.id}/readings`, { headers: authHeaders(isolatedTeacherLogin.cookie) })).status, 403);

    // Same stored completion is visible from a separately authenticated device/session.
    const deviceTwo = await login('cedar-school', 'invited-student', 'invited-student-password-long');
    assert.equal(deviceTwo.response.status, 200);
    const deviceTwoList = await request(`/readings/${reading.id}/completions`, { headers: authHeaders(deviceTwo.cookie) });
    assert.equal(deviceTwoList.status, 200);
    assert.ok((await deviceTwoList.json() as any).completions.some((item: any) => item.id === completion.id));

    // Reopen SQLite and prove sessions persist without storing raw passwords or session cookies.
    const sessionCookie = studentCookie;
    await new Promise<void>(resolve => server!.close(() => resolve()));
    server = undefined;
    store.close();
    const rawDb = readFileSync(database);
    assert.equal(rawDb.includes(Buffer.from('invited-student-password-long')), false);
    assert.equal(rawDb.includes(Buffer.from(sessionCookie.split('=')[1])), false);
    const inspection = new DatabaseSync(database, { readOnly: true });
    const storedHash = inspection.prepare('SELECT token_hash FROM sessions LIMIT 1').get() as { token_hash: string };
    assert.ok(storedHash);
    assert.notEqual(storedHash.token_hash, sessionCookie.split('=')[1]);
    inspection.close();
    store = new AccountStore(database);
    const resumed = express();
    resumed.use('/api', createAccountsRouter({ store, origin, enabled: true }));
    server = resumed.listen(port, '127.0.0.1');
    await new Promise<void>((resolve, reject) => { server!.once('listening', resolve); server!.once('error', reject); });
    await ready(authHeaders(sessionCookie));
    const restored = await get('/accounts/me', { headers: authHeaders(sessionCookie) });
    assert.equal(restored.status, 200);
    assert.equal((await restored.json() as any).user.id, student.id);
    const persistedCompletions = await get(`/readings/${reading.id}/completions`, { headers: authHeaders(teacherCookie) });
    assert.ok((await persistedCompletions.json() as any).completions.some((item: any) => item.id === completion.id));
    const logout = await request('/accounts/logout', { method: 'POST', headers: authHeaders(sessionCookie, studentCsrf) });
    assert.equal(logout.status, 204);
    assert.equal((await get('/accounts/me', { headers: authHeaders(sessionCookie) })).status, 401);
  } finally {
    if (server?.listening) await new Promise<void>(resolve => server!.close(() => resolve()));
    try { store.close(); } catch { /* closed before reopening */ }
    rmSync(directory, { recursive: true, force: true });
  }
});

test('disabled accounts router leaves status available and rejects protected routes', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'noon-accounts-off-'));
  const store = new AccountStore(path.join(directory, 'accounts.sqlite'));
  const app = express();
  app.use('/api', createAccountsRouter({ store, origin: 'http://127.0.0.1:43198', enabled: false }));
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/accounts/status`)).status, 200);
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/accounts/me`)).status, 503);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

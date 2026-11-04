import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import express from 'express';
import { AccountStore } from '../server/features/accounts/store.js';
import { createAccountsRouter } from '../server/features/accounts/router.js';
import { ClassroomStore } from '../server/features/classrooms/store.js';
import { fetchAuthenticatedUserId } from '../src/features/accounts/sessionIdentity.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('public trial exposes existing school roles while preserving current role scopes and library isolation', { timeout: 30000 }, async () => {
  const directory = mkdtempSync('/dev/shm/noon-public-trial-');
  const database = path.join(directory, 'synthetic.sqlite');
  const store = new AccountStore(database);
  const classrooms = new ClassroomStore(store);
  const password = 'synthetic-public-trial-password';
  const school = await store.bootstrapSchool('trial-school', 'مدرسة اصطناعية للتجربة', 'trial-admin', password, 'مدير اصطناعي');
  const otherSchool = await store.bootstrapSchool('trial-other', 'مدرسة اصطناعية أخرى', 'other-admin', password, 'مدير آخر اصطناعي');
  const adminToken = await store.login('trial-school', 'trial-admin', password);
  const otherAdminToken = await store.login('trial-other', 'other-admin', password);
  const classroom = classrooms.createClass(adminToken, school.schoolId, { name: 'فصل اصطناعي أصلي' });
  const foreignClass = classrooms.createClass(otherAdminToken, otherSchool.schoolId, { name: 'فصل المدرسة الاصطناعية الأخرى' });
  const teacherInvite = classrooms.createInvitation(adminToken, classroom.id, { role: 'teacher' });
  const studentInvite = classrooms.createInvitation(adminToken, classroom.id, { role: 'student' });
  const teacher = await classrooms.acceptInvitation({ token: teacherInvite.token, username: 'trial-teacher', password, displayName: 'معلّم اصطناعي' });
  const student = await classrooms.acceptInvitation({ token: studentInvite.token, username: 'trial-student', password, displayName: 'طالب اصطناعي' });

  const probe = createServer();
  await new Promise<void>((resolve, reject) => { probe.once('listening', resolve); probe.once('error', reject); probe.listen(0, '127.0.0.1'); });
  const address = probe.address();
  assert.ok(address && typeof address !== 'string');
  const port = address.port;
  await new Promise<void>(resolve => probe.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`;
  const app = express();
  app.use('/api', createAccountsRouter({ store, origin, enabled: true, publicAccess: true }));
  const server = app.listen(port, '127.0.0.1');
  await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const request = (route: string, init: RequestInit = {}) => fetch(`${origin}/api${route}`, init);
  const json = (body: unknown) => ({ 'Content-Type': 'application/json', Origin: origin, ...(body ? {} : {}) });
  const authHeaders = (session: { cookie: string; csrf: string }, extra: Record<string, string> = {}) => ({ Cookie: session.cookie, Origin: origin, ...(session.csrf ? { 'X-CSRF-Token': session.csrf } : {}), ...extra });
  async function publicSession(userId: string, previous?: { cookie: string; csrf: string }) {
    const headers: Record<string, string> = { ...json({ userId }) };
    if (previous) headers.Cookie = previous.cookie;
    const response = await request('/accounts/public-session', { method: 'POST', headers, body: JSON.stringify({ userId }) });
    assert.equal(response.status, 200);
    const identity = await response.json() as any;
    assert.equal(identity.publicTrial, true);
    assert.ok(identity.csrfToken);
    const cookies = response.headers.getSetCookie();
    const trialCookie = cookies.find(value => value.startsWith('noon_local_trial_session='));
    assert.ok(trialCookie);
    return { identity, cookie: trialCookie.split(';')[0], csrf: identity.csrfToken as string };
  }
  const call = (route: string, session: { cookie: string; csrf: string }, method: string, body?: unknown) => request(route, {
    method,
    headers: authHeaders(session, body === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  try {
    const status = await request('/accounts/status');
    assert.equal(status.status, 200);
    assert.deepEqual(await status.json(), { enabled: true, mode: 'local-only', publicAccess: true });

    const publicUsers = await request('/accounts/public-users');
    assert.equal(publicUsers.status, 200);
    const publicAccounts = (await publicUsers.json() as any).accounts;
    assert.equal(publicAccounts.length, 4);
    assert.deepEqual(new Set(publicAccounts.map((item: any) => item.role)), new Set(['school_admin', 'teacher', 'student']));
    assert.ok(publicAccounts.some((item: any) => item.school.id === otherSchool.schoolId));
    for (const account of publicAccounts) {
      assert.deepEqual(Object.keys(account).sort(), ['displayName', 'id', 'role', 'school', 'username']);
      assert.deepEqual(Object.keys(account.school).sort(), ['id', 'name', 'slug']);
      assert.match(account.id, UUID);
      assert.equal('password_hash' in account, false);
    }
    assert.equal((await request('/accounts/dashboard')).status, 401, 'public account data is listed, but role APIs still require an explicit trial session');

    let active = await publicSession(teacher.id);
    assert.equal(active.identity.role, 'teacher');
    assert.equal((await (await request('/accounts/me', { headers: { Cookie: active.cookie } })).json() as any).publicTrial, true);
    const teacherDash = await request('/accounts/dashboard', { headers: { Cookie: active.cookie } });
    assert.equal(teacherDash.status, 200);
    assert.deepEqual((await teacherDash.json() as any).classes.map((item: any) => item.id), [classroom.id]);
    assert.equal((await request(`/classes/${foreignClass.id}/readings`, { headers: { Cookie: active.cookie } })).status, 403, 'public access does not remove existing school and role scope');

    const readingResponse = await call(`/classes/${classroom.id}/readings`, active, 'POST', { title: 'قراءة اصطناعية', pagesFrom: 3, pagesTo: 6 });
    assert.equal(readingResponse.status, 201);
    const reading = (await readingResponse.json() as any).reading;
    assert.equal((await call(`/classes/${classroom.id}/readings`, { ...active, csrf: '' }, 'POST', { title: 'بدون رمز', pagesFrom: 1, pagesTo: 1 })).status, 403, 'CSRF protection remains active for anonymous trial visitors');

    active = await publicSession(student.id, active);
    assert.equal(active.identity.role, 'student');
    const completion = await call(`/readings/${reading.id}/completion`, active, 'POST', { submissionId: '11111111-1111-4111-8111-111111111111' });
    assert.equal(completion.status, 201);
    const studentDash = await request('/accounts/dashboard', { headers: { Cookie: active.cookie } });
    assert.equal((await studentDash.json() as any).stats.completions, 1);

    active = await publicSession(store.identity(adminToken).user.id, active);
    assert.equal(active.identity.role, 'school_admin');
    const createdClass = await call(`/schools/${school.schoolId}/classes`, active, 'POST', { name: 'فصل أُنشئ عبر التجربة' });
    assert.equal(createdClass.status, 201);
    const added = await call(`/classes/${classroom.id}/members`, active, 'POST', { userId: student.id });
    assert.ok([200, 201].includes(added.status));
    const renamed = await call(`/classes/${classroom.id}`, active, 'PATCH', { name: 'فصل عُدّل عبر التجربة' });
    assert.equal(renamed.status, 200);
    assert.equal((await renamed.json() as any).classroom.name, 'فصل عُدّل عبر التجربة');

    const member = await call(`/schools/${school.schoolId}/members`, active, 'POST', { username: 'trial-added-user', password: 'synthetic-added-password', displayName: 'عضو اصطناعي جديد', role: 'student' });
    assert.equal(member.status, 201);
    const addedMember = (await member.json() as any).member;
    const membership = await call(`/classes/${classroom.id}/members`, active, 'POST', { userId: addedMember.id });
    assert.equal(membership.status, 201);
    const removed = await call(`/classes/${classroom.id}/members/${addedMember.id}`, active, 'DELETE');
    assert.equal(removed.status, 204);
    assert.equal((await store.listPublicTrialAccounts()).some((item: any) => item.id === addedMember.id), true, 'existing delete removes class membership, not the user account or its history');

    active = await publicSession(store.identity(otherAdminToken).user.id, active);
    assert.equal(active.identity.school.id, otherSchool.schoolId);
    assert.equal((await request('/accounts/dashboard', { headers: { Cookie: active.cookie } })).status, 200, 'a public visitor can explicitly select any existing school account');

    const gateResult = await fetchAuthenticatedUserId(async () => new Response(JSON.stringify({ publicTrial: true, user: { id: teacher.id } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    assert.equal(gateResult, null, 'public trial cookies do not unlock the local library');
    const authenticatedResult = await fetchAuthenticatedUserId(async () => new Response(JSON.stringify({ user: { id: teacher.id } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    assert.equal(authenticatedResult, teacher.id, 'ordinary authenticated sessions retain the existing library behavior');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import { AccountStore } from '../server/features/accounts/store.js';
import { createAccountsRouter } from '../server/features/accounts/router.js';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

test('dashboard and class roster contracts: scoped SQL counts, membership changes, persistence', async () => {
  // Keep all disposable database files on the requested local tmpfs.
  const directory = mkdtempSync('/dev/shm/noon-dashboard-test-');
  const database = path.join(directory, 'accounts.sqlite');
  let store = new AccountStore(database);
  let server: ReturnType<ReturnType<typeof express>['listen']> | undefined;
  try {
    const cedar = await store.bootstrapSchool('dash-cedar', 'Cedar', 'cedar-admin', 'cedar-admin-password', 'Cedar Admin');
    const maple = await store.bootstrapSchool('dash-maple', 'Maple', 'maple-admin', 'maple-admin-password', 'Maple Admin');
    const cedarAdminToken = await store.login('dash-cedar', 'cedar-admin', 'cedar-admin-password');
    const mapleAdminToken = await store.login('dash-maple', 'maple-admin', 'maple-admin-password');
    const probe = express().listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => { probe.once('listening', resolve); probe.once('error', reject); });
    const address = probe.address();
    assert.ok(address && typeof address !== 'string');
    const port = address.port;
    await new Promise<void>(resolve => probe.close(() => resolve()));
    const origin = `http://127.0.0.1:${port}`;
    const mount = () => {
      const app = express();
      app.use('/api', createAccountsRouter({ store, origin, enabled: true }));
      server = app.listen(port, '127.0.0.1');
      return new Promise<void>((resolve, reject) => { server!.once('listening', resolve); server!.once('error', reject); });
    };
    await mount();
    const request = (route: string, init: RequestInit = {}) => fetch(`${origin}/api${route}`, init);
    const json = (value: unknown) => ({ headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) });
    const login = async (slug: string, username: string, password: string) => {
      const response = await request('/accounts/login', { method: 'POST', ...json({ schoolSlug: slug, username, password }), headers: { ...json({}).headers, Origin: origin } });
      assert.equal(response.status, 200);
      const payload = await response.json() as any;
      const cookie = response.headers.get('set-cookie');
      assert.ok(cookie?.includes('noon_local_session='));
      return { cookie: cookie!.split(';')[0], csrf: payload.csrfToken as string };
    };
    const auth = (cookie: string, csrf?: string) => ({ Cookie: cookie, Origin: origin, ...(csrf ? { 'x-csrf-token': csrf } : {}) });
    const admin = await login('dash-cedar', 'cedar-admin', 'cedar-admin-password');
    const mapleAdmin = await login('dash-maple', 'maple-admin', 'maple-admin-password');
    const createClass = async (schoolId: string, authData: typeof admin, name: string) => {
      const r = await request(`/schools/${schoolId}/classes`, { method: 'POST', ...json({ name }), headers: { ...auth(authData.cookie, authData.csrf), ...json({}).headers } });
      assert.equal(r.status, 201);
      return (await r.json() as any).classroom;
    };
    const classA = await createClass(cedar.schoolId, admin, 'Cedar A');
    const classB = await createClass(cedar.schoolId, admin, 'Cedar B');
    const foreignClass = await createClass(maple.schoolId, mapleAdmin, 'Maple A');
    const invite = async (classId: string, role: 'teacher' | 'student', who: string) => {
      const r = await request(`/classes/${classId}/invitations`, { method: 'POST', ...json({ role }), headers: { ...auth(admin.cookie, admin.csrf), ...json({}).headers } });
      assert.equal(r.status, 201);
      const token = (await r.json() as any).token;
      const accepted = await request('/accounts/accept-invite', { method: 'POST', ...json({ token, username: who, password: `${who}-long-password`, displayName: `${who} Name` }), headers: { ...json({}).headers, Origin: origin } });
      assert.equal(accepted.status, 201);
      return (await accepted.json() as any).member;
    };
    const teacher = await invite(classA.id, 'teacher', 'cedar-teacher');
    const student = await invite(classA.id, 'student', 'cedar-student');
    const peer = await invite(classA.id, 'student', 'cedar-peer');
    const teacherB = await invite(classB.id, 'teacher', 'cedar-other-teacher');
    const mapleTeacherInvite = await request(`/classes/${foreignClass.id}/invitations`, { method: 'POST', ...json({ role: 'teacher' }), headers: { ...auth(mapleAdmin.cookie, mapleAdmin.csrf), ...json({}).headers } });
    assert.equal(mapleTeacherInvite.status, 201);
    const mapleTeacherAccept = await request('/accounts/accept-invite', { method: 'POST', ...json({ token: (await mapleTeacherInvite.json() as any).token, username: 'maple-teacher', password: 'maple-teacher-password', displayName: 'Maple Teacher' }), headers: { ...json({}).headers, Origin: origin } });
    assert.equal(mapleTeacherAccept.status, 201);
    const foreignTeacher = (await mapleTeacherAccept.json() as any).member;
    const mapleStudentInvite = await request(`/classes/${foreignClass.id}/invitations`, { method: 'POST', ...json({ role: 'student' }), headers: { ...auth(mapleAdmin.cookie, mapleAdmin.csrf), ...json({}).headers } });
    const mapleStudentAccept = await request('/accounts/accept-invite', { method: 'POST', ...json({ token: (await mapleStudentInvite.json() as any).token, username: 'maple-student', password: 'maple-student-password', displayName: 'Maple Student' }), headers: { ...json({}).headers, Origin: origin } });
    assert.equal(mapleStudentAccept.status, 201);

    const teacherLogin = await login('dash-cedar', teacher.username, 'cedar-teacher-long-password');
    const teacherBLogin = await login('dash-cedar', teacherB.username, 'cedar-other-teacher-long-password');
    const studentLogin = await login('dash-cedar', student.username, 'cedar-student-long-password');
    const peerLogin = await login('dash-cedar', peer.username, 'cedar-peer-long-password');
    const empty = await request('/accounts/dashboard');
    assert.equal(empty.status, 401);
    const blankDash = async (credentials: typeof admin) => {
      const response = await request('/accounts/dashboard', { headers: auth(credentials.cookie) });
      assert.equal(response.status, 200);
      return response.json() as Promise<any>;
    };
    const initial = await blankDash(admin);
    assert.equal(initial.role, 'school_admin');
    assert.deepEqual(initial.stats, { classes: 2, teachers: 2, students: 2, members: 4, readings: 0, completions: 0 });
    assert.equal(initial.classes.length, 2);
    assert.ok(initial.classes.every((item: any) => item.readingCount === 0 && item.completionCount === 0));
    assert.equal(initial.members.length, 4);
    assert.ok(!initial.members.some((m: any) => m.role === 'school_admin'));
    assert.equal(initial.memberships.length, 4);
    assert.deepEqual((await blankDash(teacherLogin)).stats, { classes: 1, students: 2, readings: 0, completions: 0 });
    assert.equal((await blankDash(studentLogin)).stats.pending, 0);

    // Create a reading only in the teacher's assigned class; completion identity is scoped to current membership.
    const readingResponse = await request(`/classes/${classA.id}/readings`, { method: 'POST', ...json({ title: 'Cedar pages', pagesFrom: 5, pagesTo: 10 }), headers: { ...auth(teacherLogin.cookie, teacherLogin.csrf), ...json({}).headers } });
    assert.equal(readingResponse.status, 201);
    const reading = (await readingResponse.json() as any).reading;
    const complete = async (credentials: typeof student, submissionId: string) => request(`/readings/${reading.id}/completion`, { method: 'POST', ...json({ submissionId }), headers: { ...auth(credentials.cookie, credentials.csrf), ...json({}).headers } });
    const completion = await complete(studentLogin, uuid(1));
    assert.equal(completion.status, 201);
    const completionBody = (await completion.json() as any).completion;
    const adminDash = await blankDash(admin);
    assert.equal(adminDash.stats.readings, 1);
    assert.equal(adminDash.stats.completions, 1);
    assert.deepEqual(Object.keys(adminDash.readings[0]).sort(), ['authorName', 'classId', 'className', 'completedAt', 'createdAt', 'id', 'pagesFrom', 'pagesTo', 'title'].sort());
    assert.equal(adminDash.readings[0].authorName, teacher.displayName);
    assert.equal(adminDash.completions[0].studentName, student.displayName);
    assert.equal(adminDash.completions[0].id, completionBody.id);
    const teacherDash = await blankDash(teacherLogin);
    assert.deepEqual(teacherDash.classes.map((c: any) => c.id), [classA.id]);
    assert.equal(teacherDash.completions.length, 1);
    assert.equal('members' in teacherDash || 'memberships' in teacherDash, false);
    const studentDash = await blankDash(studentLogin);
    assert.equal(studentDash.stats.readings, 1);
    assert.equal(studentDash.stats.completions, 1);
    assert.equal(studentDash.stats.pending, 0);
    assert.equal(studentDash.stats.completionPercent, 100);
    assert.deepEqual(studentDash.completions.map((c: any) => c.studentId), [student.id]);
    assert.equal(studentDash.completions.some((c: any) => c.studentName === peer.displayName), false);
    assert.equal('members' in studentDash || 'memberships' in studentDash, false);
    const peerDash = await blankDash(peerLogin);
    assert.equal(peerDash.stats.pending, 1);
    assert.equal(peerDash.stats.completionPercent, 0);
    assert.equal(peerDash.completions.length, 0);
    assert.equal(peerDash.classes[0].completionCount, 0, 'class completion count is personal, not the cohort total');
    assert.equal('studentCount' in peerDash.classes[0] || 'teacherCount' in peerDash.classes[0], false);
    assert.equal(studentDash.classes[0].completionCount, 1);
    const forged = await request(`/accounts/dashboard?role=school_admin&schoolId=${maple.schoolId}`, {headers:auth(studentLogin.cookie)});
    assert.equal(forged.status, 200);
    const forgedData = await forged.json() as any;
    assert.equal(forgedData.role, 'student');
    assert.equal('members' in forgedData, false);
    assert.deepEqual(forgedData.classes.map((c:any)=>c.id), [classA.id]);

    // Same-school unassigned actors and foreign-school actors cannot cross class boundaries.
    const rename = (credentials: typeof admin, classId: string, body: unknown) => request(`/classes/${classId}`, { method: 'PATCH', ...json(body), headers: { ...auth(credentials.cookie, credentials.csrf), ...json({}).headers } });
    assert.equal((await rename(admin, foreignClass.id, { name: 'stolen' })).status, 403);
    assert.equal((await rename(mapleAdmin, classA.id, { name: 'stolen' })).status, 403);
    assert.equal((await rename(teacherLogin, classA.id, { name: 'stolen' })).status, 403);
    assert.equal((await request(`/classes/${foreignClass.id}/members`, { headers: auth(admin.cookie) })).status, 403);
    assert.equal((await request(`/classes/${classA.id}/members`, { headers: auth(teacherBLogin.cookie) })).status, 403);
    assert.equal((await request(`/classes/${classA.id}/members`, { headers: auth(mapleAdmin.cookie) })).status, 403);
    assert.equal((await request(`/classes/${classA.id}/members`, { headers: auth(teacherLogin.cookie) })).status, 200);
    assert.equal((await request(`/classes/${classA.id}/members`, { headers: auth(studentLogin.cookie) })).status, 403);

    const addMember = (credentials: typeof admin, classId: string, userId: string, extra: Record<string, unknown> = {}) => request(`/classes/${classId}/members`, { method: 'POST', ...json({ userId, ...extra }), headers: { ...auth(credentials.cookie, credentials.csrf), ...json({}).headers } });
    assert.equal((await addMember(teacherLogin, classA.id, peer.id)).status, 403);
    assert.equal((await addMember(studentLogin, classA.id, peer.id)).status, 403);
    assert.equal((await addMember(admin, classA.id, foreignTeacher.id)).status, 403);
    assert.equal((await addMember(admin, classA.id, store.identity(cedarAdminToken).user.id)).status, 403);
    assert.equal((await addMember(admin, foreignClass.id, student.id)).status, 403);
    assert.equal((await addMember(admin, classA.id, peer.id, { role: 'teacher' })).status, 400);
    assert.equal((await addMember(admin, classA.id, peer.id, { role: 'school_admin' })).status, 400);
    assert.equal((await request(`/classes/${classA.id}/members/${student.id}`, { method: 'DELETE', headers: { Cookie: admin.cookie, Origin: origin } })).status, 403);
    assert.equal((await addMember({ ...admin, csrf: '' }, classA.id, peer.id)).status, 403);
    const validAdd = await addMember(admin, classB.id, student.id);
    assert.equal(validAdd.status, 201);
    const replayAdd = await addMember(admin, classB.id, student.id);
    assert.equal([201, 200].includes(replayAdd.status), true);
    const rosterB = await request(`/classes/${classB.id}/members`, { headers: auth(admin.cookie) });
    assert.equal(rosterB.status, 200);
    assert.equal((await rosterB.json() as any).members.filter((m: any) => m.id === student.id).length, 1);
    assert.equal((await blankDash(admin)).stats.students, 2);
    // The same teacher/student can belong to two classes without duplicating the student count.
    assert.equal((await addMember(admin, classA.id, teacherB.id)).status, 201);
    const twoClassTeacher = await blankDash(teacherBLogin);
    assert.equal(twoClassTeacher.stats.classes, 2);
    assert.equal(twoClassTeacher.stats.students, 2);
    const renamed = await rename(admin, classA.id, {name:'Cedar A updated'});
    assert.equal(renamed.status, 200);
    assert.equal((await blankDash(admin)).classes.find((c:any)=>c.id===classA.id).name, 'Cedar A updated');

    const withdraw = async (classId: string, userId: string) => request(`/classes/${classId}/members/${userId}`, { method: 'DELETE', headers: { ...auth(admin.cookie, admin.csrf) } });
    assert.equal((await withdraw(foreignClass.id, student.id)).status, 403);
    assert.equal((await withdraw(classA.id, teacher.id)).status, 204);
    const withdrawnTeacher = await blankDash(teacherLogin);
    assert.deepEqual(withdrawnTeacher.classes, []);
    assert.equal(withdrawnTeacher.stats.readings, 0);
    assert.equal((await request(`/classes/${classA.id}/members`, { headers: auth(teacherLogin.cookie) })).status, 403);
    assert.equal((await request(`/classes/${classA.id}/readings`, {headers:auth(teacherLogin.cookie)})).status,403);
    assert.equal((await request(`/readings/${reading.id}/completions`, {headers:auth(teacherLogin.cookie)})).status,403);
    assert.equal((await withdraw(classA.id, student.id)).status, 204);
    const withdrawnStudent = await blankDash(studentLogin);
    assert.equal(withdrawnStudent.stats.readings, 0);
    assert.equal(withdrawnStudent.stats.completions, 0);
    assert.equal(withdrawnStudent.completions.length, 0);
    assert.equal((await complete(studentLogin, uuid(2))).status,403);
    assert.equal((await request(`/readings/${reading.id}/completions`, {headers:auth(studentLogin.cookie)})).status,403);
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM completions WHERE id=?').get(completionBody.id)?.n, 1);
    assert.equal((await addMember(admin, classA.id, student.id)).status, 201);
    const restoredStudent = await blankDash(studentLogin);
    assert.equal(restoredStudent.stats.completions, 1);
    assert.equal(restoredStudent.stats.completionPercent, 100);

    // Memberships and completion history are durable in the local SQLite database.
    await new Promise<void>(resolve => server!.close(() => resolve()));
    server = undefined;
    store.close();
    store = new AccountStore(database);
    await mount();
    const persisted = await blankDash(admin);
    assert.equal(persisted.stats.completions, 1);
    assert.equal(persisted.completions.some((c: any) => c.id === completionBody.id), true);
    assert.equal((await blankDash(studentLogin)).stats.completions, 1);
  } finally {
    if (server?.listening) await new Promise<void>(resolve => server!.close(() => resolve()));
    try { store.close(); } catch { /* the store was closed before SQLite reopen */ }
    rmSync(directory, { recursive: true, force: true });
  }
});

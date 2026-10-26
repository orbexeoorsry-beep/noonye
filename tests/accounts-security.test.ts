import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { AccountError, AccountStore, hashToken } from '../server/features/accounts/store.js';
import { ClassroomStore } from '../server/features/classrooms/store.js';

async function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), 'noon-account-security-'));
  const dbPath = path.join(dir, 'accounts.sqlite');
  const accounts = new AccountStore(dbPath);
  const school = await accounts.bootstrapSchool('security-school', 'Security School', 'admin', 'admin-password-long', 'Admin');
  const classrooms = new ClassroomStore(accounts);
  const adminToken = await accounts.login('security-school', 'admin', 'admin-password-long');
  const classA = classrooms.createClass(adminToken, school.schoolId, { name: 'A' });
  const classB = classrooms.createClass(adminToken, school.schoolId, { name: 'B' });
  const invite = (classId: string, role: 'teacher' | 'student' = 'student') => classrooms.createInvitation(adminToken, classId, { role });
  const accept = (token: string, username: string) => classrooms.acceptInvitation({ token, username, password: `${username}-password-long`, displayName: username });
  return { dir, dbPath, accounts, classrooms, school, adminToken, classA, classB, invite, accept };
}
const cleanup = (f: Awaited<ReturnType<typeof fixture>>) => { f.accounts.close(); rmSync(f.dir, { recursive: true, force: true }); };
const rejectsCode = async (promise: Promise<unknown>, code: string, status?: number) => {
  await assert.rejects(promise, (e: unknown) => e instanceof AccountError && e.code === code && (status === undefined || e.status === status));
};

test('expired identity sessions are rejected at the expiration boundary', async () => {
  const f = await fixture();
  try {
    const now = Date.now(), token = await f.accounts.login('security-school', 'admin', 'admin-password-long', now);
    assert.equal(f.accounts.identity(token, now).user.username, 'admin');
    assert.throws(() => f.accounts.identity(token, now + 8 * 60 * 60 * 1000), (e: unknown) => e instanceof AccountError && e.status === 401);
  } finally { cleanup(f); }
});

test('expired invitation returns 410; token is stored only as a hash', async () => {
  const f = await fixture();
  try {
    const invitation = f.invite(f.classA.id);
    const stored = f.accounts.db.prepare('SELECT token_hash, expires_at FROM invitations WHERE class_id=?').get(f.classA.id) as { token_hash: string; expires_at: number };
    assert.equal(stored.token_hash, hashToken(invitation.token));
    assert.notEqual(stored.token_hash, invitation.token);
    f.accounts.db.prepare('UPDATE invitations SET expires_at=? WHERE token_hash=?').run(Date.now() - 1, stored.token_hash);
    await rejectsCode(f.accept(invitation.token, 'expired-user'), 'invalid_invitation', 410);
  } finally { cleanup(f); }
});

test('username collision rolls back invitation consumption so a different username can accept', async () => {
  const f = await fixture();
  try {
    await f.accounts.createMember(f.adminToken, f.school.schoolId, { username: 'taken-name', password: 'taken-password-long', displayName: 'Taken', role: 'student' });
    const invitation = f.invite(f.classA.id);
    await rejectsCode(f.accept(invitation.token, 'taken-name'), 'username_unavailable', 409);
    const accepted = await f.accept(invitation.token, 'available-name');
    assert.equal(accepted.username, 'available-name');
  } finally { cleanup(f); }
});

test('concurrent acceptance of the same invite has exactly one success', async () => {
  const f = await fixture();
  try {
    const invitation = f.invite(f.classA.id);
    const results = await Promise.allSettled([f.accept(invitation.token, 'racer-one'), f.accept(invitation.token, 'racer-two')]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(results.filter(r => r.status === 'rejected').length, 1);
    assert.equal(f.accounts.db.prepare('SELECT count(*) AS n FROM class_members WHERE class_id=?').get(f.classA.id)?.n, 1);
  } finally { cleanup(f); }
});

test('completion replay and simultaneous submissions are first-write-wins', async () => {
  const f = await fixture();
  try {
    const student = await f.accept(f.invite(f.classA.id).token, 'completion-student');
    const token = await f.accounts.login('security-school', student.username, 'completion-student-password-long');
    const reading = f.classrooms.createReading((await (async () => { const teacherInvite = f.invite(f.classA.id, 'teacher'); const teacher = await f.accept(teacherInvite.token, 'completion-teacher'); return f.accounts.login('security-school', teacher.username, 'completion-teacher-password-long'); })()), f.classA.id, { title: 'Read', pagesFrom: 1, pagesTo: 2 });
    const [a, b] = await Promise.all([
      Promise.resolve().then(() => f.classrooms.completeReading(token, reading.id, { submissionId: '11111111-1111-4111-8111-111111111111' })),
      Promise.resolve().then(() => f.classrooms.completeReading(token, reading.id, { submissionId: '22222222-2222-4222-8222-222222222222' })),
    ]);
    assert.deepEqual(a.completion, b.completion);
    assert.equal([a.replay, b.replay].filter(x => x === false).length, 1);
    assert.equal([a.replay, b.replay].filter(x => x === true).length, 1);
    const replay = f.classrooms.completeReading(token, reading.id, { submissionId: '33333333-3333-4333-8333-333333333333' });
    assert.equal(replay.replay, true);
    assert.deepEqual(replay.completion, a.completion);
    assert.equal(f.accounts.db.prepare('SELECT count(*) AS n FROM completions WHERE reading_id=?').get(reading.id)?.n, 1);
  } finally { cleanup(f); }
});

test('invitation role is server-controlled and cannot be injected as school_admin', async () => {
  const f = await fixture();
  try {
    const invitation = f.invite(f.classA.id, 'teacher');
    await rejectsCode(f.classrooms.acceptInvitation({ token: invitation.token, username: 'injected-role', password: 'injected-role-password', displayName: 'Injected', role: 'school_admin' }), 'invalid_input');
    const member = await f.accept(invitation.token, 'proper-teacher');
    assert.equal(member.role, 'teacher');
    await rejectsCode(f.accounts.createMember(member.id, f.school.schoolId, { username: 'student-spoof', password: 'student-spoof-password', displayName: 'Spoof', role: 'school_admin' }), 'unauthenticated');
    const student = await f.accept(f.invite(f.classA.id).token, 'proper-student');
    const studentSession = await f.accounts.login('security-school', student.username, 'proper-student-password-long');
    await rejectsCode(f.accounts.createMember(studentSession, f.school.schoolId, { username: 'teacher-spoof', password: 'teacher-spoof-password', displayName: 'Spoof', role: 'teacher' }), 'forbidden', 403);
    await rejectsCode(f.accounts.createMember(f.adminToken, f.school.schoolId, { username: 'admin-spoof', password: 'admin-spoof-password', displayName: 'Spoof', role: 'school_admin' }), 'invalid_input');
  } finally { cleanup(f); }
});

test('teacher cannot create or read readings in another class', async () => {
  const f = await fixture();
  try {
    const teacher = await f.accept(f.invite(f.classA.id, 'teacher').token, 'class-teacher');
    const token = await f.accounts.login('security-school', teacher.username, 'class-teacher-password-long');
    assert.throws(() => f.classrooms.createReading(token, f.classB.id, { title: 'Nope', pagesFrom: 1, pagesTo: 1 }), (e: unknown) => e instanceof AccountError && e.status === 403);
    assert.throws(() => f.classrooms.listReadings(token, f.classB.id), (e: unknown) => e instanceof AccountError && e.status === 403);
  } finally { cleanup(f); }
});

test('database permissions are 0600 and unsupported schema versions are rejected', async () => {
  const f = await fixture();
  f.accounts.close();
  try {
    assert.equal(statSync(f.dbPath).mode & 0o777, 0o600);
    const { DatabaseSync } = await import('node:sqlite');
    const db = new DatabaseSync(f.dbPath);
    db.exec('PRAGMA user_version=3'); db.close();
    assert.throws(() => new AccountStore(f.dbPath), (e: unknown) => e instanceof AccountError && e.code === 'unsupported_schema_version' && e.status === 500);
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});

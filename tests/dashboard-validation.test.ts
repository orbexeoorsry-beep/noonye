import assert from 'node:assert/strict';
import { parseDashboard } from '../src/features/accounts/dashboardValidation';
import type { Role } from '../src/features/accounts/api';

const ids = {
  cls: '11111111-1111-4111-8111-111111111111',
  reading: '22222222-2222-4222-8222-222222222222',
  completion: '33333333-3333-4333-8333-333333333333',
  teacher: '44444444-4444-4444-8444-444444444444',
  student: '55555555-5555-4555-8555-555555555555',
};
const base = () => ({ role: 'student', stats: { classes: 1, readings: 1, completions: 0, pending: 1, completionPercent: 0 },
  classes: [{ id: ids.cls, name: 'Class', readingCount: 1, completionCount: 0 }],
  readings: [{ id: ids.reading, classId: ids.cls, className: 'Class', title: 'Read', pagesFrom: 1, pagesTo: 5, createdAt: 1, authorName: 'Teacher', completedAt: null }], completions: [] });
const admin = () => ({ ...base(), role: 'school_admin', stats: { classes: 1, teachers: 1, students: 1, members: 2, readings: 1, completions: 0 },
  classes: [{ ...base().classes[0], teacherCount: 1, studentCount: 1 }],
  members: [{ id: ids.teacher, username: 'teach', displayName: 'Teacher', role: 'teacher' }, { id: ids.student, username: 'stud', displayName: 'Student', role: 'student' }],
  memberships: [{ classId: ids.cls, userId: ids.teacher, role: 'teacher' }, { classId: ids.cls, userId: ids.student, role: 'student' }] });
const teacher = () => ({ ...base(), role: 'teacher', stats: { classes: 1, students: 1, readings: 1, completions: 0 }, classes: [{ ...base().classes[0], teacherCount: 1, studentCount: 1 }] });
const valid = (role: Role) => role === 'school_admin' ? admin() : role === 'teacher' ? teacher() : base();

for (const role of ['school_admin', 'teacher', 'student'] as const) {
  assert.ok(parseDashboard(valid(role), role), `${role} dashboard accepted`);
}
assert.equal(parseDashboard(base(), 'teacher'), null);
assert.equal(parseDashboard(null, 'student'), null);
for (const field of ['members', 'memberships']) {
  const missing = admin(); delete (missing as any)[field]; assert.equal(parseDashboard(missing, 'school_admin'), null);
  const nil = admin(); (nil as any)[field] = null; assert.equal(parseDashboard(nil, 'school_admin'), null);
  const object = admin(); (object as any)[field] = {}; assert.equal(parseDashboard(object, 'school_admin'), null);
}
for (const mutate of [
  (x: any) => x.members[0] = null,
  (x: any) => x.members[0].role = 'admin',
  (x: any) => x.members[0].id = 'not-a-uuid',
  (x: any) => x.members[0].username = 7,
  (x: any) => x.memberships[0].classId = ids.reading,
  (x: any) => x.memberships[0].userId = ids.reading,
  (x: any) => x.memberships[0].role = 'student',
  (x: any) => x.memberships[0] = null,
  (x: any) => x.members.push({...x.members[0]}),
  (x: any) => x.memberships.push({...x.memberships[0]}),
  (x: any) => delete x.classes[0].teacherCount,
  (x: any) => delete x.classes[0].studentCount,
]) { const x = admin(); mutate(x); assert.equal(parseDashboard(x, 'school_admin'), null); }
for (const role of ['teacher', 'student'] as const) {
  const x: any = valid(role); x.members = []; assert.equal(parseDashboard(x, role), null);
  const y: any = valid(role); y.memberships = []; assert.equal(parseDashboard(y, role), null);
}
for (const change of [
  (x: any) => x.stats.classes = -1,
  (x: any) => x.stats.classes = 1.5,
  (x: any) => x.stats.classes = Infinity,
  (x: any) => x.stats.completionPercent = 101,
  (x: any) => x.classes[0] = null,
  (x: any) => x.classes[0].id = 'bad',
  (x: any) => x.readings[0] = null,
  (x: any) => x.readings[0].pagesTo = 0,
  (x: any) => x.readings[0].pagesTo = 10001,
  (x: any) => x.readings[0].createdAt = 1.5,
  (x: any) => x.classes[0].studentCount = 3,
  (x: any) => x.completions.push(null),
]) { const x: any = base(); change(x); assert.equal(parseDashboard(x, 'student'), null); }
const empty = { ...base(), classes: [], readings: [], completions: [] };
assert.ok(parseDashboard(empty, 'student'), 'empty lists are valid');
const oldCounts = { ...teacher(), classes: [{ id: ids.cls, name: 'Class', readingCount: 0, completionCount: 0 }] };
assert.equal(parseDashboard(oldCounts, 'teacher'), null, 'teacher class counters must be present');
console.log('dashboard validation: passed');

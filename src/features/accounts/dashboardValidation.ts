import type { Dashboard, DashboardClass, DashboardCompletion, DashboardMember, DashboardReading } from './dashboard';
import type { Role } from './api';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID_V4.test(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isCount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const isTimestamp = (value: unknown): value is number => isCount(value);
const isPercent = (value: unknown): value is number => isCount(value) && (value as number) <= 100;

function validClass(value: unknown, role: Role): value is DashboardClass {
  if (!isRecord(value) || !isUuid(value.id) || !isText(value.name) || !isCount(value.readingCount) || !isCount(value.completionCount)) return false;
  return role === 'student'
    ? value.teacherCount === undefined && value.studentCount === undefined
    : isCount(value.teacherCount) && isCount(value.studentCount);
}
function validReading(value: unknown): value is DashboardReading {
  return isRecord(value) && isUuid(value.id) && isUuid(value.classId) && isText(value.className) &&
    isText(value.title) && isCount(value.pagesFrom) && (value.pagesFrom as number) >= 1 &&
    isCount(value.pagesTo) && (value.pagesTo as number) >= (value.pagesFrom as number) && (value.pagesTo as number) <= 10000 &&
    isTimestamp(value.createdAt) && isText(value.authorName) &&
    (value.completedAt === null || isTimestamp(value.completedAt));
}
function validCompletion(value: unknown): value is DashboardCompletion {
  return isRecord(value) && isUuid(value.id) && isUuid(value.readingId) && isUuid(value.classId) &&
    isUuid(value.studentId) && isText(value.studentName) && isText(value.readingTitle) && isTimestamp(value.completedAt);
}
function validMember(value: unknown): value is DashboardMember {
  return isRecord(value) && isUuid(value.id) && isText(value.username) && isText(value.displayName) &&
    (value.role === 'teacher' || value.role === 'student');
}

/** Validate and narrow an untrusted dashboard response for the requested account role. */
export function parseDashboard(value: unknown, expectedRole: Role): Dashboard | null {
  if (!isRecord(value) || value.role !== expectedRole || !isRecord(value.stats)) return null;
  const stats = value.stats;
  const required = expectedRole === 'school_admin'
    ? ['classes', 'teachers', 'students', 'members', 'readings', 'completions']
    : expectedRole === 'teacher'
      ? ['classes', 'students', 'readings', 'completions']
      : ['classes', 'readings', 'completions', 'pending', 'completionPercent'];
  if (!required.every((key) => isCount(stats[key]))) return null;
  if (expectedRole === 'student' && !isPercent(stats.completionPercent)) return null;
  if (!Array.isArray(value.classes) || !value.classes.every((item) => validClass(item, expectedRole)) ||
      !Array.isArray(value.readings) || !value.readings.every(validReading) ||
      !Array.isArray(value.completions) || !value.completions.every(validCompletion)) return null;

  if (expectedRole === 'school_admin') {
    if (!Array.isArray(value.members) || !value.members.every(validMember) ||
        !Array.isArray(value.memberships)) return null;
    const classes = new Set(value.classes.map((item) => item.id));
    const members = new Map(value.members.map((item) => [item.id, item.role]));
    if (classes.size !== value.classes.length || members.size !== value.members.length) return null;
    const links = new Set<string>();
    for (const membership of value.memberships) {
      if (!isRecord(membership) || !isUuid(membership.classId) || !isUuid(membership.userId) ||
          (membership.role !== 'teacher' && membership.role !== 'student') ||
          !classes.has(membership.classId) || members.get(membership.userId) !== membership.role) return null;
      const key = `${membership.classId}:${membership.userId}`;
      if (links.has(key)) return null;
      links.add(key);
    }
  } else if (Object.prototype.hasOwnProperty.call(value, 'members') || Object.prototype.hasOwnProperty.call(value, 'memberships')) {
    return null;
  }
  return value as unknown as Dashboard;
}

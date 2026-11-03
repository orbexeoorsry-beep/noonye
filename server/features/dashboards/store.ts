import { randomUUID } from 'node:crypto';
import { AccountError, AccountStore } from '../accounts/store.js';

type Actor = ReturnType<AccountStore['identity']>;
const own = (value: unknown, keys: string[]) => !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).sort().join(',') === keys.slice().sort().join(',');
const uuidV4 = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
const invalid = () => { throw new AccountError('invalid_input'); };

/** SQL-backed dashboard snapshots and narrowly scoped class administration. */
export class DashboardStore {
  constructor(private accounts: AccountStore) {}
  private get db() { return this.accounts.db; }
  private actor(token: string): Actor { return this.accounts.identity(token); }

  get(token: string) {
    const actor = this.actor(token);
    this.db.exec('BEGIN');
    try {
      const isAdmin = actor.role === 'school_admin';
      if (!isAdmin && actor.role !== 'teacher' && actor.role !== 'student') throw new AccountError('forbidden', 403);
      const params = isAdmin ? [actor.school.id] : [actor.user.id, actor.role, actor.school.id];
      const membership = isAdmin ? '' : 'JOIN class_members cm ON cm.class_id=c.id AND cm.user_id=? AND cm.role=?';
      const classes = this.db.prepare(`SELECT c.id,c.name,
        (SELECT COUNT(*) FROM class_members t WHERE t.class_id=c.id AND t.role='teacher') AS teacherCount,
        (SELECT COUNT(*) FROM class_members s WHERE s.class_id=c.id AND s.role='student' AND s.user_id IN (SELECT id FROM users WHERE school_id=c.school_id)) AS studentCount,
        (SELECT COUNT(*) FROM readings r WHERE r.class_id=c.id) AS readingCount,
        (SELECT COUNT(*) FROM completions x JOIN readings r ON r.id=x.reading_id JOIN class_members sm ON sm.class_id=r.class_id AND sm.user_id=x.student_id AND sm.role='student' JOIN users su ON su.id=x.student_id AND su.school_id=c.school_id WHERE r.class_id=c.id ${actor.role === 'student' ? 'AND x.student_id=?' : ''}) AS completionCount
        FROM classes c ${membership} WHERE c.school_id=? ORDER BY c.name,c.id`).all(...(actor.role === 'student' ? [actor.user.id, ...params] : params)) as any[];
      const ids = classes.map(c => c.id);
      let readings: any[] = [], completions: any[] = [];
      if (ids.length) {
        const placeholders = ids.map(() => '?').join(',');
        readings = this.db.prepare(`SELECT r.id,r.class_id AS classId,c.name AS className,r.title,r.pages_from AS pagesFrom,r.pages_to AS pagesTo,r.created_at AS createdAt,u.display_name AS authorName,
          ${actor.role === 'student' ? '(SELECT x.completed_at FROM completions x WHERE x.reading_id=r.id AND x.student_id=?)' : 'NULL'} AS completedAt
          FROM readings r JOIN classes c ON c.id=r.class_id JOIN users u ON u.id=r.author_id WHERE r.class_id IN (${placeholders}) ORDER BY r.created_at,r.id`).all(...(actor.role === 'student' ? [actor.user.id, ...ids] : ids)) as any[];
        completions = this.db.prepare(`SELECT x.id,x.reading_id AS readingId,r.class_id AS classId,x.student_id AS studentId,u.display_name AS studentName,r.title AS readingTitle,x.completed_at AS completedAt
          FROM completions x JOIN readings r ON r.id=x.reading_id JOIN classes c ON c.id=r.class_id JOIN class_members m ON m.class_id=r.class_id AND m.user_id=x.student_id AND m.role='student' JOIN users u ON u.id=x.student_id AND u.school_id=c.school_id
          WHERE c.school_id=? AND r.class_id IN (${placeholders}) ${actor.role === 'student' ? 'AND x.student_id=?' : ''} ORDER BY x.completed_at,x.id`).all(actor.school.id, ...ids, ...(actor.role === 'student' ? [actor.user.id] : [])) as any[];
      }
      const completionCount = completions.length;
      let stats: any;
      if (isAdmin) {
        const counts = this.db.prepare(`SELECT
          (SELECT COUNT(*) FROM users WHERE school_id=? AND role='teacher') AS teachers,
          (SELECT COUNT(*) FROM users WHERE school_id=? AND role='student') AS students,
          (SELECT COUNT(*) FROM users WHERE school_id=? AND role IN ('teacher','student')) AS members,
          (SELECT COUNT(*) FROM readings r JOIN classes c ON c.id=r.class_id WHERE c.school_id=?) AS readings`).get(actor.school.id, actor.school.id, actor.school.id, actor.school.id) as any;
        stats = { classes: classes.length, teachers: counts.teachers, students: counts.students, members: counts.members, readings: counts.readings, completions: completionCount };
      } else if (actor.role === 'teacher') {
        const students = ids.length ? (this.db.prepare(`SELECT COUNT(DISTINCT m.user_id) AS count FROM class_members m JOIN users u ON u.id=m.user_id WHERE m.role='student' AND u.school_id=? AND m.class_id IN (${ids.map(() => '?').join(',')})`).get(actor.school.id, ...ids) as {count:number}).count : 0;
        stats = { classes: classes.length, students, readings: readings.length, completions: completionCount };
      } else {
        const pending = readings.filter(r => r.completedAt === null).length;
        stats = { classes: classes.length, readings: readings.length, completions: completionCount, pending, completionPercent: readings.length ? Math.round(completionCount * 100 / readings.length) : 0 };
      }
      // A student receives neither cohort member counts nor peer completion totals.
      const visibleClasses = actor.role === 'student' ? classes.map(({teacherCount,studentCount,...personal}) => personal) : classes;
      const result: any = { role: actor.role, stats, classes: visibleClasses, readings, completions };
      if (isAdmin) {
        result.members = this.db.prepare("SELECT id,username,display_name AS displayName,role FROM users WHERE school_id=? AND role IN ('teacher','student') ORDER BY username,id").all(actor.school.id);
        result.memberships = this.db.prepare("SELECT m.class_id AS classId,m.user_id AS userId,m.role FROM class_members m JOIN classes c ON c.id=m.class_id WHERE c.school_id=? ORDER BY m.class_id,m.user_id").all(actor.school.id);
      }
      this.db.exec('COMMIT');
      return result;
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }

  private classroom(token: string, classId: string, allowed: ('school_admin'|'teacher')[] = ['school_admin','teacher']) {
    const actor = this.actor(token);
    if (!uuidV4(classId) || !allowed.includes(actor.role as any)) throw new AccountError('forbidden', 403);
    const row = this.db.prepare('SELECT id,name,school_id FROM classes WHERE id=?').get(classId) as any;
    if (!row || row.school_id !== actor.school.id) throw new AccountError('forbidden', 403);
    if (actor.role === 'teacher' && !this.db.prepare("SELECT 1 FROM class_members WHERE class_id=? AND user_id=? AND role='teacher'").get(classId, actor.user.id)) throw new AccountError('forbidden', 403);
    return { actor, row };
  }
  rename(token: string, classId: string, input: unknown) {
    const { row } = this.classroom(token, classId, ['school_admin']);
    if (!own(input, ['name']) || typeof (input as any).name !== 'string' || !(input as any).name.trim() || (input as any).name.length > 120) invalid();
    const name = (input as any).name.trim();
    this.db.prepare('UPDATE classes SET name=? WHERE id=? AND school_id=?').run(name, classId, row.school_id);
    return { id: classId, name };
  }
  listMembers(token: string, classId: string) {
    this.classroom(token, classId);
    return this.db.prepare("SELECT u.id,u.username,u.display_name AS displayName,m.role FROM class_members m JOIN users u ON u.id=m.user_id JOIN classes c ON c.id=m.class_id WHERE m.class_id=? AND c.school_id=u.school_id AND m.role IN ('teacher','student') ORDER BY m.role,u.username,u.id").all(classId);
  }
  addMember(token: string, classId: string, input: unknown) {
    const { actor, row } = this.classroom(token, classId, ['school_admin']);
    if (!own(input, ['userId']) || !uuidV4((input as any).userId)) invalid();
    const userId = (input as any).userId;
    const user = this.db.prepare("SELECT id,role FROM users WHERE id=? AND school_id=? AND role IN ('teacher','student')").get(userId, actor.school.id) as any;
    if (!user || user.role === 'school_admin') throw new AccountError('forbidden', 403);
    const existing = this.db.prepare('SELECT 1 FROM class_members WHERE class_id=? AND user_id=?').get(classId, userId);
    if (!existing) this.db.prepare('INSERT INTO class_members(class_id,user_id,role) VALUES(?,?,?)').run(classId, userId, user.role);
    return { membership: { classId: row.id, userId, role: user.role }, replay: !!existing };
  }
  removeMember(token: string, classId: string, userId: string) {
    this.classroom(token, classId, ['school_admin']);
    if (!uuidV4(userId)) invalid();
    this.db.prepare('DELETE FROM class_members WHERE class_id=? AND user_id=?').run(classId, userId);
  }
}

import { randomBytes, randomUUID as uuid } from 'node:crypto';
import { AccountError, AccountStore, hashToken, passwordHash, type Member } from '../accounts/store.js';

const own = (value: unknown, keys: string[]) => !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === keys.slice().sort().join(',');
const bad = () => { throw new AccountError('invalid_input'); };
const uuidV4 = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

type Actor = ReturnType<AccountStore['identity']>;
export class ClassroomStore {
  constructor(private accounts: AccountStore) {
    accounts.db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY, school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE, name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 120));
      CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);
      CREATE TABLE IF NOT EXISTS class_members (class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL CHECK(role IN ('teacher','student')), PRIMARY KEY(class_id,user_id));
      CREATE INDEX IF NOT EXISTS idx_class_members_user ON class_members(user_id,class_id);
      CREATE TABLE IF NOT EXISTS invitations (token_hash TEXT PRIMARY KEY, class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE, role TEXT NOT NULL CHECK(role IN ('teacher','student')), expires_at INTEGER NOT NULL, used_at INTEGER);
      CREATE INDEX IF NOT EXISTS idx_invitations_class ON invitations(class_id,expires_at);
      CREATE TABLE IF NOT EXISTS readings (id TEXT PRIMARY KEY, class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE, author_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 120), pages_from INTEGER NOT NULL CHECK(pages_from BETWEEN 1 AND 10000), pages_to INTEGER NOT NULL CHECK(pages_to BETWEEN pages_from AND 10000), created_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_readings_class ON readings(class_id,created_at);
      CREATE TABLE IF NOT EXISTS completions (id TEXT PRIMARY KEY, reading_id TEXT NOT NULL REFERENCES readings(id) ON DELETE CASCADE, student_id TEXT NOT NULL REFERENCES users(id), submission_id TEXT NOT NULL, completed_at INTEGER NOT NULL, UNIQUE(reading_id,student_id));
      CREATE INDEX IF NOT EXISTS idx_completions_reading ON completions(reading_id,completed_at);`);
  }
  private actor(token: string): Actor { return this.accounts.identity(token); }
  private classInSchool(classId: string, schoolId: string) {
    return this.accounts.db.prepare('SELECT id,school_id,name FROM classes WHERE id=? AND school_id=?').get(classId, schoolId) as {id:string;school_id:string;name:string}|undefined;
  }
  createClass(token: string, schoolId: string, input: unknown) {
    const actor = this.actor(token);
    if (actor.role !== 'school_admin' || actor.school.id !== schoolId) throw new AccountError('forbidden',403);
    if (!own(input,['name']) || typeof (input as any).name !== 'string' || !(input as any).name.trim() || (input as any).name.length > 120) bad();
    const id = uuid(), name = (input as any).name.trim();
    this.accounts.db.prepare('INSERT INTO classes(id,school_id,name) VALUES(?,?,?)').run(id,schoolId,name);
    return {id,name};
  }
  listSchoolClasses(token: string, schoolId: string) {
    const actor = this.actor(token);
    if (actor.role !== 'school_admin' || actor.school.id !== schoolId) throw new AccountError('forbidden',403);
    return this.accounts.db.prepare('SELECT id,name FROM classes WHERE school_id=? ORDER BY name,id').all(schoolId) as {id:string;name:string}[];
  }
  listClasses(token: string) {
    const actor = this.actor(token);
    if (actor.role === 'school_admin') return this.accounts.db.prepare('SELECT id,name FROM classes WHERE school_id=? ORDER BY name,id').all(actor.school.id) as {id:string;name:string}[];
    if (!['teacher','student'].includes(actor.role)) throw new AccountError('forbidden',403);
    return this.accounts.db.prepare('SELECT c.id,c.name FROM classes c JOIN class_members m ON m.class_id=c.id WHERE m.user_id=? AND m.role=? AND c.school_id=? ORDER BY c.name,c.id').all(actor.user.id,actor.role,actor.school.id) as {id:string;name:string}[];
  }
  createInvitation(token: string, classId: string, input: unknown) {
    const actor = this.actor(token);
    if (!own(input,['role']) || !['teacher','student'].includes(String((input as any).role))) bad();
    const klass = this.classInSchool(classId,actor.school.id);
    if (actor.role !== 'school_admin' || !klass) throw new AccountError('forbidden',403);
    const secret = randomBytes(32).toString('base64url'), expiresAt = Date.now()+24*60*60*1000;
    this.accounts.db.prepare('INSERT INTO invitations(token_hash,class_id,role,expires_at,used_at) VALUES(?,?,?,?,NULL)').run(hashToken(secret),classId,(input as any).role,expiresAt);
    return {token:secret,expiresAt,role:(input as any).role,classId};
  }
  async acceptInvitation(input: unknown): Promise<Member> {
    if (!own(input,['token','username','password','displayName'])) bad();
    const v = input as Record<string,unknown>;
    if (typeof v.token!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(v.token) || typeof v.username!=='string' || !/^[a-z0-9][a-z0-9._-]{2,63}$/.test(v.username) || typeof v.password!=='string' || v.password.length<12 || v.password.length>128 || typeof v.displayName!=='string' || !v.displayName.trim() || v.displayName.length>100) bad();
    const inviteToken = v.token as string, username = v.username as string, password = v.password as string, displayName = v.displayName as string;
    const invitation = this.accounts.db.prepare('SELECT i.class_id,i.role,i.expires_at,i.used_at,c.school_id FROM invitations i JOIN classes c ON c.id=i.class_id WHERE i.token_hash=?').get(hashToken(inviteToken)) as {class_id:string;role:'teacher'|'student';expires_at:number;used_at:number|null;school_id:string}|undefined;
    if (!invitation || invitation.used_at!==null || invitation.expires_at<=Date.now()) throw new AccountError('invalid_invitation',410);
    const encoded = await passwordHash(password);
    // Recheck after scrypt and consume token plus account/membership in one transaction.
    this.accounts.db.exec('BEGIN IMMEDIATE');
    try {
      const current = this.accounts.db.prepare('SELECT i.class_id,i.role,i.expires_at,i.used_at,c.school_id FROM invitations i JOIN classes c ON c.id=i.class_id WHERE i.token_hash=?').get(hashToken(inviteToken)) as typeof invitation;
      const now=Date.now();
      if (!current || current.used_at!==null || current.expires_at<=now) throw new AccountError('invalid_invitation',410);
      const id=uuid();
      this.accounts.db.prepare('INSERT INTO users(id,school_id,username,display_name,password_hash,role) VALUES(?,?,?,?,?,?)').run(id,current.school_id,username,displayName.trim(),encoded,current.role);
      this.accounts.db.prepare('INSERT INTO class_members(class_id,user_id,role) VALUES(?,?,?)').run(current.class_id,id,current.role);
      const used=this.accounts.db.prepare('UPDATE invitations SET used_at=? WHERE token_hash=? AND used_at IS NULL AND expires_at>?').run(now,hashToken(inviteToken),now);
      if (used.changes!==1) throw new AccountError('invalid_invitation',410);
      this.accounts.db.exec('COMMIT');
      return {id,username,displayName:displayName.trim(),role:current.role};
    } catch (error) {
      this.accounts.db.exec('ROLLBACK');
      if (error instanceof AccountError) throw error;
      if ((error as Error).message.includes('UNIQUE constraint failed')) throw new AccountError('username_unavailable',409);
      throw error;
    }
  }
  createReading(token: string,classId:string,input:unknown) {
    const actor=this.actor(token);
    if (!own(input,['title','pagesFrom','pagesTo'])) bad();
    const v=input as Record<string,unknown>;
    if(typeof v.title!=='string'||v.title.length<1||v.title.length>120||!v.title.trim()||!Number.isInteger(v.pagesFrom)||!Number.isInteger(v.pagesTo)||(v.pagesFrom as number)<1||(v.pagesTo as number)>10000||(v.pagesFrom as number)>(v.pagesTo as number)) bad();
    const klass=this.classInSchool(classId,actor.school.id);
    const member=klass&&actor.role==='teacher'&&this.accounts.db.prepare("SELECT 1 FROM class_members WHERE class_id=? AND user_id=? AND role='teacher'").get(classId,actor.user.id);
    if(!member) throw new AccountError('forbidden',403);
    const id=uuid(),createdAt=Date.now(),title=(v.title as string).trim();
    this.accounts.db.prepare('INSERT INTO readings(id,class_id,author_id,title,pages_from,pages_to,created_at) VALUES(?,?,?,?,?,?,?)').run(id,classId,actor.user.id,title,v.pagesFrom as number,v.pagesTo as number,createdAt);
    return {id,classId,title,pagesFrom:v.pagesFrom,pagesTo:v.pagesTo,createdAt};
  }
  listReadings(token:string,classId:string) {
    const actor=this.actor(token), klass=this.classInSchool(classId,actor.school.id);
    const member=klass&&['teacher','student'].includes(actor.role)&&this.accounts.db.prepare('SELECT 1 FROM class_members WHERE class_id=? AND user_id=? AND role=?').get(classId,actor.user.id,actor.role);
    if(!klass||(!member&&actor.role!=='school_admin')) throw new AccountError('forbidden',403);
    return this.accounts.db.prepare('SELECT id,class_id AS classId,title,pages_from AS pagesFrom,pages_to AS pagesTo,created_at AS createdAt FROM readings WHERE class_id=? ORDER BY created_at,id').all(classId);
  }
  completeReading(token:string,readingId:string,input:unknown) {
    const actor=this.actor(token);
    if(!own(input,['submissionId'])||!uuidV4((input as any).submissionId)) bad();
    const reading=this.accounts.db.prepare('SELECT r.id,r.class_id,c.school_id FROM readings r JOIN classes c ON c.id=r.class_id WHERE r.id=?').get(readingId) as {id:string;class_id:string;school_id:string}|undefined;
    const member=reading&&actor.role==='student'&&actor.school.id===reading.school_id&&this.accounts.db.prepare("SELECT 1 FROM class_members WHERE class_id=? AND user_id=? AND role='student'").get(reading.class_id,actor.user.id);
    if(!member) throw new AccountError('forbidden',403);
    const old=this.accounts.db.prepare('SELECT id,reading_id,student_id,completed_at FROM completions WHERE reading_id=? AND student_id=?').get(readingId,actor.user.id) as any;
    if(old) return {completion:{id:old.id,readingId:old.reading_id,studentId:old.student_id,completedAt:old.completed_at},replay:true};
    const completion={id:uuid(),readingId,studentId:actor.user.id,completedAt:Date.now()};
    try { this.accounts.db.prepare('INSERT INTO completions(id,reading_id,student_id,submission_id,completed_at) VALUES(?,?,?,?,?)').run(completion.id,readingId,actor.user.id,(input as any).submissionId,completion.completedAt); }
    catch(e) { const repeated=this.accounts.db.prepare('SELECT id,reading_id,student_id,completed_at FROM completions WHERE reading_id=? AND student_id=?').get(readingId,actor.user.id) as any; if(repeated)return {completion:{id:repeated.id,readingId:repeated.reading_id,studentId:repeated.student_id,completedAt:repeated.completed_at},replay:true}; throw e; }
    return {completion,replay:false};
  }
  listCompletions(token:string,readingId:string) {
    const actor=this.actor(token);
    const reading=this.accounts.db.prepare('SELECT r.class_id,c.school_id FROM readings r JOIN classes c ON c.id=r.class_id WHERE r.id=?').get(readingId) as {class_id:string;school_id:string}|undefined;
    if(!reading||reading.school_id!==actor.school.id) throw new AccountError('forbidden',403);
    const teacher=actor.role==='teacher'&&this.accounts.db.prepare("SELECT 1 FROM class_members WHERE class_id=? AND user_id=? AND role='teacher'").get(reading.class_id,actor.user.id);
    const student=actor.role==='student'&&this.accounts.db.prepare("SELECT 1 FROM class_members WHERE class_id=? AND user_id=? AND role='student'").get(reading.class_id,actor.user.id);
    if(!teacher&&!student&&actor.role!=='school_admin') throw new AccountError('forbidden',403);
    const rows=this.accounts.db.prepare('SELECT id,reading_id,student_id,completed_at FROM completions WHERE reading_id=? ORDER BY completed_at,id').all(readingId) as any[];
    const visible=student?rows.filter(r=>r.student_id===actor.user.id):rows;
    return visible.map(r=>({id:r.id,readingId:r.reading_id,studentId:r.student_id,completedAt:r.completed_at}));
  }
}

import React, { FormEvent, useState } from 'react';
import type { Me } from './api';
import { DashboardState, Empty, MetricCards, RefreshButton, useDashboard } from './dashboard';
import MemberForm from './MemberForm';

export default function AdminDashboard({ me, onSessionExpired }: { me: Me; onSessionExpired: () => void }) {
  const { data, loading, error, refresh, mutate } = useDashboard(me, onSessionExpired);
  const [classId, setClassId] = useState('');
  const [newClass, setNewClass] = useState('');
  const [rename, setRename] = useState('');
  const [memberId, setMemberId] = useState('');
  const [invite, setInvite] = useState<{ token: string; role: string; expiresAt: number } | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const selected = data?.classes.find((item) => item.id === classId);
  const members = data?.members || [];
  const rosterIds = new Set((data?.memberships || []).filter((membership) => membership.classId === classId).map((membership) => membership.userId));
  const roster = members.filter((member) => rosterIds.has(member.id));

  async function action(fn: () => Promise<unknown>, success: string) {
    setBusy(true); setMessage('');
    try { await fn(); setMessage(success); await refresh(); }
    catch { setMessage('تعذر إتمام العملية؛ تحقق من الاتصال ثم أعد المحاولة.'); }
    finally { setBusy(false); }
  }
  async function createClass(event: FormEvent) {
    event.preventDefault();
    if (!newClass.trim()) return;
    await action(() => mutate(`/api/schools/${encodeURIComponent(me.school.id)}/classes`, 'POST', { name: newClass.trim() }), 'تم إنشاء الفصل.');
    setNewClass('');
  }
  async function renameClass(event: FormEvent) {
    event.preventDefault();
    if (!classId || !rename.trim()) return;
    await action(() => mutate(`/api/classes/${encodeURIComponent(classId)}`, 'PATCH', { name: rename.trim() }), 'تم تحديث اسم الفصل.');
  }
  async function assign() {
    if (!classId || !memberId) return;
    await action(() => mutate(`/api/classes/${encodeURIComponent(classId)}/members`, 'POST', { userId: memberId }), 'تم إسناد العضوية للفصل.');
  }
  async function remove(userId: string) {
    if (!classId) return;
    await action(() => mutate(`/api/classes/${encodeURIComponent(classId)}/members/${encodeURIComponent(userId)}`, 'DELETE'), 'تم سحب العضوية فقط.');
  }
  async function issue(role: 'teacher' | 'student') {
    if (!classId) return;
    await action(async () => { const result = await mutate(`/api/classes/${encodeURIComponent(classId)}/invitations`, 'POST', { role }); setInvite(result); }, 'تم إنشاء الدعوة مرة واحدة.');
  }
  const stats = data?.stats || {};
  return <section data-testid="admin-dashboard" className="space-y-6">
    <div className="flex justify-end"><RefreshButton onClick={() => void refresh()} disabled={loading} /></div>
    <DashboardState loading={loading} error={error} retry={() => void refresh()} />
    {data && <>
      <MetricCards values={['classes', 'teachers', 'students', 'members', 'readings', 'completions'].map((key) => [({ classes: 'الفصول', teachers: 'المعلّمون', students: 'الطلاب', members: 'الأعضاء', readings: 'القراءات', completions: 'الإتمامات' } as Record<string, string>)[key], stats[key] || 0]) as [string, number][]} />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5">
          <h3 className="text-lg font-bold">إدارة الفصول</h3>
          <form onSubmit={createClass} className="mt-4 flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="new-class">اسم الفصل الجديد</label>
            <input id="new-class" aria-label="اسم الفصل الجديد" value={newClass} onChange={(event) => setNewClass(event.target.value)} placeholder="اسم الفصل" className="min-w-0 flex-1 rounded-lg border p-2" />
            <button disabled={busy} className="rounded-lg bg-indigo-700 px-4 py-2 text-white">إنشاء فصل</button>
          </form>
          <label className="mt-4 block text-sm">الفصل
            <select data-testid="class-selector" value={classId} onChange={(event) => { setClassId(event.target.value); setRename(''); setInvite(null); }} className="mt-1 w-full rounded-lg border bg-white p-2">
              <option value="">اختر فصلاً</option>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          {selected && <>
            <form onSubmit={renameClass} className="mt-3 flex gap-2">
              <label className="sr-only" htmlFor="rename-class">اسم الفصل</label>
              <input id="rename-class" data-testid="rename-class-input" aria-label="اسم الفصل الجديد" value={rename} onChange={(event) => setRename(event.target.value)} placeholder={selected.name} className="min-w-0 flex-1 rounded-lg border p-2" />
              <button data-testid="rename-class-button" className="rounded-lg border px-3">حفظ الاسم</button>
            </form>
            <p className="mt-3 text-sm text-slate-600">{selected.teacherCount} معلّم · {selected.studentCount} طالب · {selected.readingCount} قراءة · {selected.completionCount} إتمام</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={busy} onClick={() => void issue('teacher')} className="rounded-lg border px-3 py-2">دعوة معلّم</button>
              <button disabled={busy} onClick={() => void issue('student')} className="rounded-lg border px-3 py-2">دعوة طالب</button>
              <button onClick={() => void refresh()} className="rounded-lg border px-3 py-2">عرض أعضاء الفصل</button>
            </div>
            {invite && <div className="mt-3 rounded-xl bg-amber-50 p-3"><strong>رمز الدعوة (يظهر مرة واحدة؛ شاركه يدوياً)</strong><code dir="ltr" className="my-2 block break-all">{invite.token}</code><span className="text-sm">صالح حتى {new Date(invite.expiresAt).toLocaleString('ar')}</span></div>}
            <label className="mt-4 block text-sm">إضافة عضو موجود
              <select data-testid="member-selector" value={memberId} onChange={(event) => setMemberId(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2"><option value="">اختر معلماً أو طالباً</option>{members.map((member) => <option key={member.id} value={member.id}>{member.displayName} · {member.role === 'teacher' ? 'معلّم' : 'طالب'}</option>)}</select>
            </label>
            <button data-testid="assign-member-button" disabled={!memberId || busy} onClick={() => void assign()} className="mt-2 rounded-lg bg-indigo-700 px-3 py-2 text-white disabled:opacity-50">إسناد العضو للفصل</button>
            <h4 className="mt-4 font-semibold">أعضاء الفصل الحاليون</h4>
            {roster.length === 0 ? <Empty>لا يوجد أعضاء حاليون في هذا الفصل.</Empty> : <ul className="divide-y">{roster.map((member) => <li key={member.id} className="flex items-center justify-between gap-3 py-2"><span>{member.displayName} · {member.role === 'teacher' ? 'معلّم' : 'طالب'}</span><button data-testid={`remove-member-${member.id}`} onClick={() => void remove(member.id)} className="text-sm text-red-700 underline">سحب العضوية</button></li>)}</ul>}
          </>}
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <h3 className="text-lg font-bold">إنشاء حساب عضو</h3>
          <MemberForm onCreate={async (member) => {
            await mutate(`/api/schools/${encodeURIComponent(me.school.id)}/members`, 'POST', member);
            await refresh();
          }} />
        </section>
        <section className="rounded-2xl border bg-white p-5 lg:col-span-2">
          <h3 className="text-lg font-bold">الأعضاء في المدرسة</h3>
          {members.length ? <ul className="divide-y">{members.map((member) => <li key={member.id} className="flex justify-between py-3"><span>{member.displayName}<small className="mr-2 text-slate-500">@{member.username}</small></span><span>{member.role === 'teacher' ? 'معلّم' : 'طالب'}</span></li>)}</ul> : <Empty>لا توجد حسابات معلّمين أو طلاب حالياً.</Empty>}
          <p className="mt-4 text-sm text-slate-500">تُدار العضوية دون حذف الحساب أو بياناته التاريخية.</p>
        </section>
      </div>
      {message && <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm">{message}</p>}
    </>}
  </section>;
}

import React, { FormEvent, useState } from 'react';
import type { Me } from './api';
import { DashboardState, Empty, MetricCards, RefreshButton, useDashboard } from './dashboard';

export default function TeacherDashboard({ me, onSessionExpired }: { me: Me; onSessionExpired: () => void }) {
  const { data, loading, error, refresh, mutate } = useDashboard(me, onSessionExpired);
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('');
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState('1');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const current = data?.classes.find((item) => item.id === classId);
  const readings = (data?.readings || []).filter((reading) => reading.classId === classId);
  const completions = data?.completions || [];
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!classId) return;
    setBusy(true); setMessage('');
    try {
      await mutate(`/api/classes/${encodeURIComponent(classId)}/readings`, 'POST', { title, pagesFrom: Number(from), pagesTo: Number(to) });
      setTitle(''); setMessage('تم إسناد القراءة للفصل.'); await refresh();
    } catch { setMessage('تعذر إسناد القراءة. حاول مجدداً.'); }
    finally { setBusy(false); }
  }
  return <section data-testid="teacher-dashboard" className="space-y-6">
    <div className="flex justify-end"><RefreshButton onClick={() => void refresh()} disabled={loading} /></div>
    <DashboardState loading={loading} error={error} retry={() => void refresh()} />
    {data && <>
      <MetricCards values={[["فصولي", data.stats.classes], ["الطلاب", data.stats.students], ["القراءات", data.stats.readings], ["الإتمامات", data.stats.completions]]} />
      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-lg font-bold">تكليفات فصولي</h3>
        <p className="mt-1 text-sm text-slate-600">تعرض الأعداد والإتمامات المسجلة ذاتياً للفصول المعيّنة لك؛ قد يشترك معلّمون آخرون في الفصل. الإتمام المبلّغ عنه ليس تقييماً للإتقان.</p>
        <label className="mt-4 block text-sm">الفصل
          <select data-testid="class-selector" value={classId} onChange={(event) => setClassId(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2"><option value="">اختر فصلاً</option>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </label>
        {current && <p className="mt-3 text-sm text-slate-600">{current.studentCount} طالب · {current.readingCount} قراءة · {current.completionCount} إتمام</p>}
        {classId && <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">عنوان القراءة<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="عنوان القراءة" className="mt-1 w-full rounded-lg border p-2" /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">من صفحة<input required type="number" min="1" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
            <label className="text-sm">إلى صفحة<input required type="number" min={from} value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
          </div>
          <button disabled={busy} className="rounded-lg bg-indigo-700 px-4 py-2 text-white sm:col-span-2">إسناد قراءة للفصل</button>
        </form>}
        <h4 className="mt-6 font-semibold">القراءات المسندة</h4>
        {!classId ? <Empty>اختر فصلاً لعرض قراءاته وسجل الإتمام.</Empty> : readings.length === 0 ? <Empty>لا توجد قراءات لهذا الفصل حالياً.</Empty> : <ul className="mt-2 divide-y">
          {readings.map((reading) => <li data-testid="reading-card" data-reading-id={reading.id} key={reading.id} className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span><strong>{reading.title}</strong><span className="block text-sm text-slate-500">الصفحات {reading.pagesFrom}–{reading.pagesTo} · أُسندت بواسطة {reading.authorName}</span></span>
              <button onClick={() => document.getElementById(`history-${reading.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} className="rounded-lg border px-3 py-2">عرض الإتمامات</button>
            </div>
            <ul id={`history-${reading.id}`} className="mt-2 text-sm">{completions.filter((completion) => completion.readingId === reading.id).map((completion) => <li key={completion.id} className="py-1">{completion.studentName} · أتمّ في {new Date(completion.completedAt).toLocaleString('ar')}</li>)}</ul>
            {completions.every((completion) => completion.readingId !== reading.id) && <p className="mt-2 text-sm text-slate-500">لا توجد إتمامات مسجلة بعد.</p>}
          </li>)}
        </ul>}
      </section>
    </>}
  </section>;
}

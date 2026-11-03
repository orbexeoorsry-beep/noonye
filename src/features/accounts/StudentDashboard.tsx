import React, { useState } from 'react';
import type { Me } from './api';
import { DashboardState, Empty, MetricCards, RefreshButton, useDashboard } from './dashboard';
type State = { status: 'saving' | 'saved' | 'error'; submissionId: string };

export default function StudentDashboard({ me, onSessionExpired }: { me: Me; onSessionExpired: () => void }) {
  const { data, loading, error, refresh, mutate } = useDashboard(me, onSessionExpired);
  const [classId, setClassId] = useState('');
  const [states, setStates] = useState<Record<string, State>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const readings = (data?.readings || []).filter((reading) => reading.classId === classId);
  const classes = data?.classes || [];
  async function complete(id: string) {
    if (busy[id] || states[id]?.status === 'saved') return;
    const submissionId = states[id]?.submissionId || crypto.randomUUID();
    setStates((value) => ({ ...value, [id]: { status: 'saving', submissionId } }));
    setBusy((value) => ({ ...value, [id]: true }));
    try {
      await mutate(`/api/readings/${encodeURIComponent(id)}/completion`, 'POST', { submissionId });
      setStates((value) => ({ ...value, [id]: { status: 'saved', submissionId } })); await refresh();
    } catch { setStates((value) => ({ ...value, [id]: { status: 'error', submissionId } })); }
    finally { setBusy((value) => ({ ...value, [id]: false })); }
  }
  const percent = data?.stats.completionPercent ?? 0;
  return <section data-testid="student-dashboard" className="space-y-6">
    <div className="flex justify-end"><RefreshButton onClick={() => void refresh()} disabled={loading} /></div>
    <DashboardState loading={loading} error={error} retry={() => void refresh()} />
    {data && <>
      <div className="rounded-2xl bg-indigo-950 p-5 text-white">
        <p className="text-sm text-indigo-200">تقدّمك المبلّغ عنه ذاتياً</p>
        <p data-testid="dashboard-stat-completionPercent" className="mt-1 text-4xl font-bold">{percent}%</p>
        <p className="mt-2 text-sm text-indigo-100">نسبة القراءات التي سجّلت إتمامها؛ ليست مقياساً للإتقان أو تحققاً من القراءة.</p>
      </div>
      <MetricCards values={[["الفصول", data.stats.classes], ["القراءات", data.stats.readings], ["الإتمامات", data.stats.completions], ["المتبقي", data.stats.pending]]} />
      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-lg font-bold">قراءات فصولي</h3>
        <label className="mt-4 block text-sm">الفصل
          <select data-testid="class-selector" value={classId} onChange={(event) => setClassId(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2"><option value="">اختر فصلاً</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </label>
        {!classId ? <Empty>اختر فصلاً لعرض قراءاتك.</Empty> : readings.length === 0 ? <Empty>لا توجد قراءات مسندة لهذا الفصل حالياً.</Empty> : <ul className="mt-3 divide-y">
          {readings.map((reading) => {
            const saved = Boolean(reading.completedAt) || states[reading.id]?.status === 'saved';
            const state = states[reading.id];
            return <li data-testid="reading-card" data-reading-id={reading.id} key={reading.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <span><strong>{reading.title}</strong><span className="block text-sm text-slate-500">الصفحات {reading.pagesFrom}–{reading.pagesTo} · {reading.className}</span></span>
              <div>
                <button data-testid="completion-button" disabled={busy[reading.id] || saved} onClick={() => void complete(reading.id)} className="rounded-lg bg-indigo-700 px-4 py-2 text-white disabled:bg-slate-400">{busy[reading.id] ? 'جارٍ الحفظ…' : saved ? 'تم الإتمام' : 'سجّلت إتمام القراءة'}</button>
                {saved && <p data-testid="completion-status" role="status" className="mt-1 text-sm text-emerald-700">محفوظ على الخادم</p>}
                {state?.status === 'error' && <p data-testid="completion-status" role="status" className="mt-1 text-sm text-red-700">تعذر الحفظ؛ أعد المحاولة<button onClick={() => void complete(reading.id)} className="mr-2 underline">إعادة المحاولة</button></p>}
              </div>
            </li>;
          })}
        </ul>}
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">تسجيل الإتمام إقرار ذاتي فقط، ولا يعني اختباراً أو حكماً على مستوى الإتقان.</p>
      </section>
    </>}
  </section>;
}

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Me } from './api';
import { readableError, request } from './api';
import { parseDashboard } from './dashboardValidation';

export type DashboardClass = { id: string; name: string; teacherCount?: number; studentCount?: number; readingCount: number; completionCount: number };
export type DashboardReading = { id: string; classId: string; className: string; title: string; pagesFrom: number; pagesTo: number; createdAt: number; authorName: string; completedAt: number | null };
export type DashboardCompletion = { id: string; readingId: string; classId: string; studentId: string; studentName: string; readingTitle: string; completedAt: number };
export type DashboardMember = { id: string; username: string; displayName: string; role: 'teacher' | 'student' };
export type Dashboard = { role: Me['role']; stats: Record<string, number>; classes: DashboardClass[]; readings: DashboardReading[]; completions: DashboardCompletion[]; members?: DashboardMember[]; memberships?: {classId:string;userId:string;role:string}[] };

export function useDashboard(me: Me, onSessionExpired: () => void) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const alive = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const pending = useRef(new Set<AbortController>());
  const refresh = useCallback(async () => {
    if (!alive.current) return;
    controller.current?.abort();
    const aborter = new AbortController();
    controller.current = aborter;
    setData(null);
    setLoading(true);
    setError('');
    try {
      const response = await request('/api/accounts/dashboard', { signal: aborter.signal });
      if (!alive.current || aborter.signal.aborted) return;
      if (response.status === 401) { onSessionExpired(); return; }
      if (!response.ok) throw new Error('network_error');
      const payload: unknown = await response.json();
      const result = parseDashboard(payload, me.role);
      if (!result) throw new Error('dashboard_invalid');
      if (alive.current && !aborter.signal.aborted) setData(result);
    } catch (reason) {
      if (alive.current && !aborter.signal.aborted) setError(reason instanceof Error && reason.message === 'dashboard_invalid' ? 'استجابة بيانات اللوحة غير صالحة؛ أعد المحاولة.' : readableError(reason instanceof Error ? reason.message : 'network_error'));
    } finally {
      if (alive.current && !aborter.signal.aborted) setLoading(false);
    }
  }, [me.role, onSessionExpired]);
  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
      controller.current?.abort();
      pending.current.forEach((item) => item.abort());
      pending.current.clear();
    };
  }, [refresh]);
  const mutate = useCallback(async (url: string, method: string, body?: unknown) => {
    const aborter = new AbortController();
    pending.current.add(aborter);
    try {
      const response = await request(url, { signal: aborter.signal, method, headers: { 'X-CSRF-Token': me.csrfToken, ...(body ? {'Content-Type':'application/json'} : {}) }, ...(body ? {body:JSON.stringify(body)} : {}) });
      if (!alive.current || aborter.signal.aborted) throw new Error('request_cancelled');
      if (response.status === 401) { if (alive.current && !aborter.signal.aborted) onSessionExpired(); throw new Error('unauthorized'); }
      if (!response.ok && response.status !== 204) throw new Error('network_error');
      if (response.status === 204) return null;
      const result = await response.json();
      if (!alive.current || aborter.signal.aborted) throw new Error('request_cancelled');
      return result;
    } finally { pending.current.delete(aborter); }
  }, [me.csrfToken, onSessionExpired]);
  return { data, loading, error, refresh, mutate };
}

export function RefreshButton({ onClick, disabled }: {onClick:()=>void;disabled?:boolean}) {
  return <button data-testid="dashboard-refresh" type="button" onClick={onClick} disabled={disabled} className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium disabled:opacity-50">تحديث من الخادم</button>;
}
export function MetricCards({ values }: { values: [string, number][] }) {
  const keys: Record<string,string> = { 'الفصول':'classes', 'فصولي':'classes', 'المعلّمون':'teachers', 'الطلاب':'students', 'الأعضاء':'members', 'القراءات':'readings', 'الإتمامات':'completions', 'المتبقي':'pending' };
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{values.map(([label, value]) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p data-testid={`dashboard-stat-${keys[label]||label}`} className="mt-1 text-2xl font-bold text-slate-900">{value}</p></article>)}</div>;
}
export function DashboardState({ loading, error, retry }: {loading:boolean;error:string;retry:()=>void}) {
  if (loading) return <p role="status" className="rounded-xl bg-white p-5 text-slate-600">جارٍ تحميل بيانات الخادم…</p>;
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}<button onClick={retry} className="mr-3 underline">إعادة المحاولة</button></div>;
  return null;
}
export function Empty({ children }: {children:React.ReactNode}) { return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{children}</p>; }

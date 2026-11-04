import React, { useCallback, useEffect, useState } from 'react';
import type { Me, PublicTrialAccount } from './api';
import { readableError, request } from './api';

function roleLabel(role: PublicTrialAccount['role']) {
  return role === 'school_admin' ? 'مدير المدرسة' : role === 'teacher' ? 'معلّم' : 'طالب';
}

export default function PublicTrialPicker({
  activeUserId,
  onStarted,
}: {
  activeUserId?: string;
  onStarted: (identity: Me) => void;
}) {
  const [accounts, setAccounts] = useState<PublicTrialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [selectError, setSelectError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await request('/api/accounts/public-users');
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'network_error');
      }
      const body = await response.json() as { accounts?: unknown };
      if (!Array.isArray(body.accounts)) throw new Error('network_error');
      setAccounts(body.accounts as PublicTrialAccount[]);
    } catch (error) {
      setLoadError(readableError(error instanceof Error ? error.message : 'network_error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function enter(account: PublicTrialAccount) {
    if (busyId) return;
    setBusyId(account.id);
    setSelectError('');
    try {
      const response = await request('/api/accounts/public-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: account.id }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'network_error');
      }
      const identity = await response.json() as Me;
      if (identity.publicTrial !== true || !identity.user?.id || !identity.school?.id || !identity.csrfToken) {
        throw new Error('network_error');
      }
      onStarted(identity);
    } catch (error) {
      setSelectError(readableError(error instanceof Error ? error.message : 'network_error'));
    } finally {
      setBusyId('');
    }
  }

  return <section data-testid="public-trial-picker" className="mx-auto mt-6 max-w-2xl rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold">دخول التجربة العامة</h2>
        <p className="mt-1 text-sm text-slate-600">اختر حساباً للدخول بصلاحياته الحالية؛ لا يلزم إدخال كلمة مرور.</p>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading || Boolean(busyId)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">{loading ? 'جارٍ التحميل…' : 'تحديث القائمة'}</button>
    </div>
    {loadError && <p role="alert" className="mt-3 text-sm text-red-700">{loadError}</p>}
    {selectError && <p role="alert" className="mt-3 text-sm text-red-700">{selectError}</p>}
    {loading && accounts.length === 0 ? <p role="status" className="mt-4 text-sm text-slate-600">جارٍ تحميل الحسابات المتاحة…</p> : accounts.length === 0 && !loadError ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">لا توجد حسابات مدرسة متاحة للاختيار حالياً.</p> : <ul className="mt-4 divide-y">
      {accounts.map(account => <li key={account.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div>
          <p className="font-semibold">{account.school.name}</p>
          <p className="text-sm text-slate-700">{account.displayName} · {roleLabel(account.role)}</p>
          <p className="text-xs text-slate-500">@{account.username} · {account.school.slug}</p>
        </div>
        <button type="button" data-testid={`public-trial-account-${account.id}`} disabled={Boolean(busyId) || activeUserId === account.id} onClick={() => void enter(account)} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busyId === account.id ? 'جارٍ فتح الحساب…' : activeUserId === account.id ? 'الحساب الحالي' : 'دخول للتجربة'}
        </button>
      </li>)}
    </ul>}
  </section>;
}

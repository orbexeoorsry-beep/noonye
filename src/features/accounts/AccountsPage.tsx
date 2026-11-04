import React, { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import type { Me } from './api';
import { readableError, request } from './api';
import { broadcastSchoolSessionChange } from './sessionSignals';
import AccountsWorkspace from './AccountsWorkspace';
import PublicTrialPicker from './PublicTrialPicker';

export function AccountsPage() {
  const [status, setStatus] = useState<'loading' | 'enabled' | 'disabled'>('loading');
  const [publicAccess, setPublicAccess] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [bootError, setBootError] = useState('');
  const [notice, setNotice] = useState('');
  const [schoolSlug, setSchoolSlug] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const alive = useRef(true);
  const epoch = useRef(0);
  const aliveFor = useCallback((n: number) => alive.current && epoch.current === n, []);

  const loadSession = useCallback(async () => {
    const n = ++epoch.current;
    setBootError('');
    try {
      const statusResponse = await request('/api/accounts/status');
      if (!aliveFor(n)) return;
      if (!statusResponse.ok) throw new Error('network_error');
      const state = await statusResponse.json();
      if (!aliveFor(n)) return;
      setPublicAccess(state.publicAccess === true);
      if (!state.enabled || state.mode === 'disabled') {
        setStatus('disabled');
        setMe(null);
        return;
      }
      setStatus('enabled');
      const response = await request('/api/accounts/me');
      if (!aliveFor(n)) return;
      if (response.status === 401) {
        broadcastSchoolSessionChange();
        setMe(null);
        return;
      }
      if (!response.ok) throw new Error('network_error');
      const identity = await response.json() as Me;
      if (aliveFor(n)) setMe(identity);
    } catch {
      if (aliveFor(n)) {
        setBootError('تعذر التحقق من حالة الحسابات حالياً.');
        setStatus('enabled');
      }
    }
  }, [aliveFor]);

  useEffect(() => {
    alive.current = true;
    void loadSession();
    return () => { alive.current = false; epoch.current++; };
  }, [loadSession]);

  async function login(event: FormEvent) {
    event.preventDefault();
    if (loginBusy) return;
    const n = epoch.current;
    setLoginBusy(true);
    setBootError('');
    setNotice('');
    try {
      const response = await request('/api/accounts/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolSlug, username, password }),
      });
      if (!aliveFor(n)) return;
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'network_error');
      }
      await response.json();
      if (!aliveFor(n)) return;
      broadcastSchoolSessionChange();
      setMe(null);
      setNotice('تم تسجيل الدخول بنجاح.');
      await loadSession();
    } catch (error) {
      if (aliveFor(n)) setBootError(readableError(error instanceof Error ? error.message : 'network_error'));
    } finally {
      setPassword('');
      if (alive.current) setLoginBusy(false);
    }
  }

  const logout = useCallback(async () => {
    if (!me) return;
    const n = epoch.current;
    try {
      const response = await request('/api/accounts/logout', { method: 'POST', headers: { 'X-CSRF-Token': me.csrfToken } });
      if (!aliveFor(n)) return;
      if (!response.ok && response.status !== 204) throw new Error();
      if (aliveFor(n)) {
        broadcastSchoolSessionChange();
        epoch.current++;
        setMe(null);
        setNotice('تم تسجيل الخروج.');
      }
    } catch {
      if (aliveFor(n)) setBootError('تعذر تأكيد تسجيل الخروج من الخادم.');
    }
  }, [me, aliveFor]);

  const sessionExpired = useCallback(() => {
    epoch.current++;
    setMe(null);
  }, []);

  async function acceptInvite(event: FormEvent) {
    event.preventDefault();
    if (inviteBusy) return;
    const n = epoch.current;
    setInviteBusy(true);
    setInviteError('');
    try {
      const response = await request('/api/accounts/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken, username: inviteUsername, password: invitePassword, displayName: inviteName }),
      });
      if (!aliveFor(n)) return;
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(readableError(body.error || 'network_error'));
      }
      if (!aliveFor(n)) return;
      setInviteToken('');
      setInviteUsername('');
      setInviteName('');
      setInviteError('تم قبول الدعوة. سجّل الدخول أدناه باستخدام رمز المدرسة الذي شاركه مديرك: ' + schoolSlug);
      await loadSession();
    } catch (error) {
      if (aliveFor(n)) setInviteError(error instanceof Error ? error.message : 'تعذر قبول الدعوة.');
    } finally {
      setInvitePassword('');
      if (alive.current) setInviteBusy(false);
    }
  }

  function startPublicTrial(identity: Me) {
    broadcastSchoolSessionChange();
    setBootError('');
    setMe(identity);
    setNotice('تم فتح الحساب للتجربة العامة.');
  }

  return <main dir="rtl" lang="ar" className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <p className="text-sm font-semibold text-indigo-700">نون · مساحة الحسابات</p>
        <h1 className="mt-1 text-3xl font-bold">حسابات المدرسة</h1>
      </header>
      {publicAccess ? <aside role="note" className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-950">
        <strong>تنبيه: التجربة العامة مفتوحة.</strong> يستطيع أي زائر اختيار أي حساب مدرسة موجود واستخدام صلاحياته الحالية، بما فيها تعديل البيانات وإزالة العضويات. لا تُدخل بيانات حقيقية. المكتبة المحلية تبقى مقفلة في جلسات التجربة العامة.
      </aside> : <aside role="note" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>تنبيه:</strong> تفتح المكتبة المدرسية بعد التحقق من جلسة الخادم، وتُفصل الملفات والملاحظات الجديدة حسب الحساب. السجلات المحلية الأقدم تبقى محفوظة ولا تُعرض في وضع المدرسة.
      </aside>}
      {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-900">{notice}</p>}
      {status === 'loading' && <p role="status">جارٍ التحقق من توفر الحسابات…</p>}
      {status === 'disabled' && <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">الحسابات غير متاحة</h2>
        <p className="mt-2 leading-7 text-slate-700">خدمة الحسابات غير مفعّلة على هذا الخادم؛ لذلك تبقى المكتبة المدرسية مقفلة. لن تُفتح سجلات التخزين المحلية القديمة أو تُنقل تلقائياً.</p>
        <p className="mt-3 text-sm text-slate-500">تفعيل الدخول وإدارة الحسابات يحتاج إعداداً على الخادم.</p>
      </section>}
      {bootError && <p role="alert" className="mb-4 text-sm text-red-700">{bootError}</p>}
      {status === 'enabled' && publicAccess && (!me || me.publicTrial) && <PublicTrialPicker activeUserId={me?.publicTrial ? me.user.id : undefined} onStarted={startPublicTrial} />}
      {status === 'enabled' && !me && <section className="mx-auto mt-6 max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">تسجيل الدخول</h2>
        <p className="mt-2 text-sm text-slate-600">{publicAccess ? 'يمكنك اختيار حساب من التجربة العامة أعلاه، أو تسجيل الدخول المعتاد بكلمة المرور.' : 'استخدم بيانات الحساب التي وفرتها مدرستك. لا توجد بيانات تجريبية لتسجيل الدخول.'}</p>
        <form onSubmit={login} className="mt-5 space-y-4">
          <label className="block text-sm font-medium">رمز المدرسة<input required autoComplete="organization" value={schoolSlug} onChange={event => setSchoolSlug(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3" /></label>
          <label className="block text-sm font-medium">اسم المستخدم<input required autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3" /></label>
          <label className="block text-sm font-medium">كلمة المرور<input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3" /></label>
          <button disabled={loginBusy} className="w-full rounded-lg bg-indigo-700 px-4 py-3 font-semibold text-white disabled:opacity-60">{loginBusy ? 'جارٍ تسجيل الدخول…' : 'دخول'}</button>
        </form>
      </section>}
      {me && <AccountsWorkspace key={me.csrfToken} me={me} onLogout={logout} onSessionExpired={sessionExpired} />}
      {status === 'enabled' && !me && <section className="mx-auto mt-8 max-w-lg rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-bold">لديك دعوة؟</h2>
        <p className="mt-1 text-sm text-slate-600">أدخل رمز الدعوة الذي استلمته من مدير المدرسة. لا تختَر دوراً؛ يحدده الخادم من الدعوة.</p>
        <form onSubmit={acceptInvite} className="mt-4 space-y-3">
          <label className="block text-sm">رمز الدعوة<input required value={inviteToken} onChange={event => setInviteToken(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
          <label className="block text-sm">الاسم الظاهر<input required value={inviteName} onChange={event => setInviteName(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
          <label className="block text-sm">اسم المستخدم<input required value={inviteUsername} onChange={event => setInviteUsername(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
          <label className="block text-sm">كلمة المرور<input required type="password" value={invitePassword} onChange={event => setInvitePassword(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
          {inviteError && <p role="status" aria-live="polite" className="text-sm text-red-700">{inviteError}</p>}
          <button disabled={inviteBusy} className="rounded bg-indigo-700 px-4 py-2 text-white">{inviteBusy ? 'جارٍ قبول الدعوة…' : 'قبول الدعوة'}</button>
        </form>
      </section>}
      <p className="mt-6 text-xs text-slate-500">ملفات PDF والملاحظات الجديدة تبقى في تخزين المتصفح الخاص بالحساب؛ أما بيانات الدخول والمدرسة فتُدار عبر الخادم.</p>
    </div>
  </main>;
}

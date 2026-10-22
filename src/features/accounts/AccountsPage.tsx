import React, { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import type { Me } from './api';
import { readableError, request } from './api';
import AccountsWorkspace from './AccountsWorkspace';

export function AccountsPage() {
  const [status, setStatus] = useState<'loading'|'enabled'|'disabled'>('loading');
  const [me, setMe] = useState<Me|null>(null);
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
  const aliveFor = useCallback((n:number)=>alive.current&&epoch.current===n,[]);
  const loadSession = useCallback(async () => {
    const n=++epoch.current; setBootError('');
    try { const sr=await request('/api/accounts/status'); if(!aliveFor(n))return; if(!sr.ok)throw new Error('network_error'); const state=await sr.json(); if(!aliveFor(n))return;
      if(!state.enabled||state.mode==='disabled'){setStatus('disabled');setMe(null);return;} setStatus('enabled');
      const r=await request('/api/accounts/me');if(!aliveFor(n))return;if(r.status===401){setMe(null);return;}if(!r.ok)throw new Error('network_error');const identity=await r.json();if(aliveFor(n))setMe(identity);
    } catch {if(aliveFor(n)){setBootError('تعذر التحقق من حالة الحسابات حالياً.');setStatus('enabled');}}
  },[aliveFor]);
  useEffect(()=>{alive.current=true;void loadSession();return()=>{alive.current=false;epoch.current++;};},[loadSession]);
  async function login(e:FormEvent){e.preventDefault();if(loginBusy)return;const n=epoch.current;setLoginBusy(true);setBootError('');setNotice('');
    try{const r=await request('/api/accounts/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schoolSlug,username,password})});if(!aliveFor(n))return;if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||'network_error');}await r.json();if(!aliveFor(n))return;setMe(null);setNotice('تم تسجيل الدخول بنجاح.');await loadSession();}
    catch(e){if(aliveFor(n))setBootError(readableError(e instanceof Error?e.message:'network_error'));}finally{setPassword('');if(alive.current)setLoginBusy(false);}}
  const logout=useCallback(async()=>{if(!me)return;const n=epoch.current;try{const r=await request('/api/accounts/logout',{method:'POST',headers:{'X-CSRF-Token':me.csrfToken}});if(!aliveFor(n))return;if(!r.ok&&r.status!==204)throw new Error();if(aliveFor(n)){epoch.current++;setMe(null);setNotice('تم تسجيل الخروج.');}}
    catch{if(aliveFor(n)){setBootError('تعذر تأكيد تسجيل الخروج من الخادم.');}}
  },[me,aliveFor]);
  const sessionExpired=useCallback(()=>{epoch.current++;setMe(null);},[]);
  async function acceptInvite(e:FormEvent){e.preventDefault();if(inviteBusy)return;const n=epoch.current;setInviteBusy(true);setInviteError('');
    try{const r=await request('/api/accounts/accept-invite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:inviteToken,username:inviteUsername,password:invitePassword,displayName:inviteName})});if(!aliveFor(n))return;if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(readableError(d.error||'network_error'));}if(!aliveFor(n))return;setInviteToken('');setInviteUsername('');setInviteName('');setInviteError('تم قبول الدعوة. سجّل الدخول أدناه باستخدام رمز المدرسة الذي شاركه مديرك: '+schoolSlug);await loadSession();}
    catch(e){if(aliveFor(n))setInviteError(e instanceof Error?e.message:'تعذر قبول الدعوة.');}finally{setInvitePassword('');if(alive.current)setInviteBusy(false);}}
  return <main dir="rtl" lang="ar" className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-4xl"><header className="mb-8"><p className="text-sm font-semibold text-indigo-700">نون · مساحة الحسابات</p><h1 className="mt-1 text-3xl font-bold">حسابات المدرسة</h1></header><aside role="note" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><strong>تنبيه:</strong> بيانات الحساب محفوظة على الخادم. ملفات المكتبة المحلية على هذا الجهاز ليست معزولة حسب الحساب؛ لا تفتحها أو تربطها بحساب آخر.</aside>
  {notice&&<p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-900">{notice}</p>}{status==='loading'&&<p role="status">جارٍ التحقق من توفر الحسابات…</p>}
  {status==='disabled'&&<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">الحسابات غير متاحة</h2><p className="mt-2 leading-7 text-slate-700">خدمة الحسابات غير مفعّلة على هذا الخادم. يمكنك استخدام التطبيق محلياً، لكن لا يمكن تسجيل الدخول أو إدارة حسابات المدرسة هنا.</p><p className="mt-3 text-sm text-slate-500">لا يتم حفظ بيانات الحسابات في هذا المتصفح.</p></section>}
  {bootError&&<p role="alert" className="mb-4 text-sm text-red-700">{bootError}</p>}
  {status==='enabled'&&!me&&<section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">تسجيل الدخول</h2><p className="mt-2 text-sm text-slate-600">استخدم بيانات الحساب التي وفرتها مدرستك. لا توجد بيانات تجريبية لتسجيل الدخول.</p><form onSubmit={login} className="mt-5 space-y-4"><label className="block text-sm font-medium">رمز المدرسة<input required autoComplete="organization" value={schoolSlug} onChange={e=>setSchoolSlug(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/></label><label className="block text-sm font-medium">اسم المستخدم<input required autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/></label><label className="block text-sm font-medium">كلمة المرور<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/></label><button disabled={loginBusy} className="w-full rounded-lg bg-indigo-700 px-4 py-3 font-semibold text-white disabled:opacity-60">{loginBusy?'جارٍ تسجيل الدخول…':'دخول'}</button></form></section>}
  {me&&<AccountsWorkspace key={me.csrfToken} me={me} onLogout={logout} onSessionExpired={sessionExpired}/>}
  {status==='enabled'&&!me&&<section className="mx-auto mt-8 max-w-lg rounded-2xl border bg-white p-6"><h2 className="text-lg font-bold">لديك دعوة؟</h2><p className="mt-1 text-sm text-slate-600">أدخل رمز الدعوة الذي استلمته من مدير المدرسة. لا تختَر دوراً؛ يحدده الخادم من الدعوة.</p><form onSubmit={acceptInvite} className="mt-4 space-y-3"><label className="block text-sm">رمز الدعوة<input required value={inviteToken} onChange={e=>setInviteToken(e.target.value)} className="mt-1 w-full rounded border p-2"/></label><label className="block text-sm">الاسم الظاهر<input required value={inviteName} onChange={e=>setInviteName(e.target.value)} className="mt-1 w-full rounded border p-2"/></label><label className="block text-sm">اسم المستخدم<input required value={inviteUsername} onChange={e=>setInviteUsername(e.target.value)} className="mt-1 w-full rounded border p-2"/></label><label className="block text-sm">كلمة المرور<input required type="password" value={invitePassword} onChange={e=>setInvitePassword(e.target.value)} className="mt-1 w-full rounded border p-2"/></label>{inviteError&&<p role="status" aria-live="polite" className="text-sm text-red-700">{inviteError}</p>}<button disabled={inviteBusy} className="rounded bg-indigo-700 px-4 py-2 text-white">{inviteBusy?'جارٍ قبول الدعوة…':'قبول الدعوة'}</button></form></section>}
  <p className="mt-6 text-xs text-slate-500">الحسابات محلية فقط، ولا يجري إرسال بيانات إلى خدمات خارجية.</p></div></main>;
}

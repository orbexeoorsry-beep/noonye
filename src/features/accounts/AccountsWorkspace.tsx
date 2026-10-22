import React, { useState } from 'react';
import type { Me } from './api';
import AdminDashboard from './AdminDashboard';
import TeacherDashboard from './TeacherDashboard';
import StudentDashboard from './StudentDashboard';

export default function AccountsWorkspace({me,onLogout,onSessionExpired}:{me:Me;onLogout:()=>Promise<void>;onSessionExpired:()=>void}) {
 const [logoutBusy,setLogoutBusy]=useState(false);
 async function logout(){if(logoutBusy)return;setLogoutBusy(true);try{await onLogout();}finally{setLogoutBusy(false);}}
 const label=me.role==='school_admin'?'مدير المدرسة':me.role==='teacher'?'معلّم':'طالب';
 return <section data-testid="accounts-workspace" data-role={me.role} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-6"><header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5"><div><p className="text-sm font-semibold text-indigo-700">{me.school.name}</p><h2 className="mt-1 text-2xl font-bold">مرحباً، {me.user.displayName}</h2><p className="mt-1 text-sm text-slate-600">{me.user.username} · {label}</p></div><button data-testid="logout-button" disabled={logoutBusy} onClick={()=>void logout()} className="rounded-lg border border-slate-300 px-4 py-2 font-medium disabled:opacity-50">{logoutBusy?'جارٍ تسجيل الخروج…':'تسجيل الخروج'}</button></header>
 {me.role==='school_admin'?<AdminDashboard me={me} onSessionExpired={onSessionExpired}/>:me.role==='teacher'?<TeacherDashboard me={me} onSessionExpired={onSessionExpired}/>:<StudentDashboard me={me} onSessionExpired={onSessionExpired}/>}
 </section>;
}

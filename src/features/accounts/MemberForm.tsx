import React, { FormEvent, useState } from 'react';

type NewMember = {
  username: string;
  password: string;
  displayName: string;
  role: 'teacher' | 'student';
};

export default function MemberForm({ onCreate }: { onCreate: (member: NewMember) => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await onCreate({ username, password, displayName, role });
      setUsername('');
      setDisplayName('');
      setRole('student');
      setMessage('تم إنشاء الحساب.');
    } catch {
      setMessage('تعذر إنشاء الحساب؛ تحقق من البيانات ثم أعد المحاولة.');
    } finally {
      setPassword('');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
      <label className="text-sm">الاسم الظاهر
        <input required maxLength={100} value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="الاسم الظاهر" className="mt-1 w-full rounded-lg border bg-white p-2" />
      </label>
      <label className="text-sm">اسم المستخدم
        <input required maxLength={64} autoComplete="off" value={username} onChange={event => setUsername(event.target.value)} placeholder="اسم المستخدم" className="mt-1 w-full rounded-lg border bg-white p-2" />
      </label>
      <label className="text-sm">كلمة المرور
        <input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="كلمة المرور" className="mt-1 w-full rounded-lg border bg-white p-2" />
      </label>
      <label className="text-sm">دور الحساب
        <select value={role} onChange={event => setRole(event.target.value as 'teacher' | 'student')} className="mt-1 w-full rounded-lg border bg-white p-2">
          <option value="student">طالب</option>
          <option value="teacher">معلّم</option>
        </select>
      </label>
      <button disabled={busy} className="rounded-lg bg-indigo-700 px-4 py-2 text-white sm:col-span-2">إنشاء الحساب</button>
      {message && <p role="status" className="sm:col-span-2 text-sm">{message}</p>}
    </form>
  );
}

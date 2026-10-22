export type Role = 'school_admin' | 'teacher' | 'student';
export type Me = { user: { id: string; username: string; displayName: string }; school: { id: string; name: string; slug?: string }; role: Role; csrfToken: string };
export const request = (url: string, init: RequestInit = {}) => fetch(url, { ...init, credentials: 'same-origin', cache: 'no-store' });
export const readableError = (code: string) => ({ invalid_credentials: 'اسم المستخدم أو كلمة المرور غير صحيحة.', unauthorized: 'انتهت الجلسة. سجّل الدخول مجدداً.', forbidden: 'لا تملك صلاحية تنفيذ هذا الإجراء.', conflict: 'اسم المستخدم مستخدم بالفعل.', invalid_input: 'تحقق من البيانات المدخلة.', network_error: 'تعذر الاتصال بالخادم. حاول مجدداً.' }[code] || 'تعذر إتمام الطلب. حاول مجدداً.');

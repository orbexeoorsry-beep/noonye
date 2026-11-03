/**
 * General Application Configuration
 */
export const appConfig = {
  name: 'نون',
  nameFull: 'نون | Noon Learning',
  slogan: 'كتابك كما هو، وفهمك أفضل',
  description:
    'منصة تعلم عربية ذكية تعرض الكتاب المدرسي الأصلي كما هو، مع مساعد فوري يفسر الفقرات والصور والمعادلات دون تغيير ترتيب الصفحات.',
  defaultLanguage: 'ar' as const,
  defaultDirection: 'rtl' as const,
  version: '1.2.0',
  defaultStudentLevel: 'المرحلة المتوسطة',
  apiProxyEndpoint: '/api/assistant/explain',
};

export default appConfig;

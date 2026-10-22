/**
 * General Application Configuration
 */
export const appConfig = {
  name: 'نون',
  nameFull: 'نون | Noon Learning',
  slogan: 'كتابك كما هو، وفهمك أفضل',
  description:
    'منصة لقراءة الكتب المدرسية بصيغتها الأصلية، مع حفظ الملفات والملاحظات محليًا على الجهاز. تقريب الصفحات وأدوات الشرح والاختبار غير متاحة حاليًا.',
  defaultLanguage: 'ar' as const,
  defaultDirection: 'rtl' as const,
  version: '1.2.0',
  defaultStudentLevel: 'المرحلة المتوسطة',
  apiProxyEndpoint: '/api/assistant/explain',
};

export default appConfig;

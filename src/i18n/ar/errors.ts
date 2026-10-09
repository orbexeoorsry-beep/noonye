import { ErrorsTranslations } from '../types';

export const errors: ErrorsTranslations = {
  invalidPdf: 'الملف المختار ليس ملف PDF صالحاً أو قد يكون تالفاً.',
  fileTooLarge: 'حجم الملف يتجاوز الحد الأقصى المسموح به (100 ميجابايت).',
  networkError: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.',
  connectionFailed: 'تعذر الاتصال بخدمة المساعد الذكي حالياً.',
  readingError: 'حدث خطأ أثناء معالجة وقراءة ملف الكتاب المدرسي.',
  unclearSelection: 'التحديد غير واضح أو صغير جداً. يرجى تحديد منطقة أكبر والمحاولة مجدداً.',
  unknownError: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
  fileTooBigError: 'حجم الملف يتجاوز الحد الأقصى (100 ميجابايت).',
  invalidPageError: 'رقم الصفحة المدخل غير صالح.',
  retryAction: 'إعادة المحاولة',
};

export default errors;

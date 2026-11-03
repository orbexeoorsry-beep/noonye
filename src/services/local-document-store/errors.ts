export type LocalDocumentErrorCode = 'unavailable' | 'quota' | 'save' | 'load' | 'missing';

export class LocalDocumentError extends Error {
  constructor(public readonly code: LocalDocumentErrorCode, options?: ErrorOptions) {
    super(`Local document ${code}`, options);
    this.name = 'LocalDocumentError';
  }
}

export function localDocumentErrorMessage(error: LocalDocumentError, isRTL: boolean): string {
  const messages: Record<LocalDocumentErrorCode, [string, string]> = {
    unavailable: [
      'تعذر الوصول إلى تخزين المتصفح. لم يتم تأكيد حفظ أي تغييرات. اسمح بالتخزين ثم أعد المحاولة، واحتفظ بنسخة الملف الأصلية.',
      'Browser storage is unavailable. No changes have been confirmed saved. Allow storage and retry; keep the original file.',
    ],
    quota: [
      'مساحة تخزين المتصفح ممتلئة. لم يتم حفظ التغييرات. حرّر مساحة ثم أعد المحاولة، واحتفظ بنسخة الملف الأصلية.',
      'Browser storage is full. Changes were not saved. Free space and retry; keep the original file.',
    ],
    save: [
      'تعذر حفظ التغييرات على هذا الجهاز. لم يتم تأكيد الحفظ. احتفظ بالملف الأصلي وأعد المحاولة.',
      'Could not save changes on this device. Saving was not confirmed. Keep the original file and retry.',
    ],
    load: [
      'تعذر قراءة الملف من تخزين المتصفح. أعد المحاولة. إذا استمرت المشكلة، عد إلى المكتبة وأعد رفع الملف الأصلي.',
      'Could not read the file from browser storage. Retry. If the problem persists, return to the library and upload the original file again.',
    ],
    missing: [
      'الملف الأصلي غير موجود في تخزين هذا المتصفح، ولم يتم استبداله بملف تجريبي. عد إلى المكتبة وأعد رفع ملف PDF الأصلي. إعادة المحاولة لن تستعيد ملفًا حُذف.',
      'The original file is missing from this browser’s storage. No sample has been substituted. Return to the library and upload the original PDF again. Retrying cannot restore a deleted file.',
    ],
  };
  return messages[error.code][isRTL ? 0 : 1];
}

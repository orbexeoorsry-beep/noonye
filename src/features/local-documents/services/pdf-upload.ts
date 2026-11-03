export class PdfUploadError extends Error {}

export interface UploadedPdfDocument {
  numPages: number;
  loadingTask: { destroy(): Promise<void> };
}

/** The file signature and parser, not the extension/MIME alone, decide validity. */
export async function inspectPdfUpload<T extends UploadedPdfDocument>(
  file: Blob,
  maxBytes: number,
  load: (bytes: ArrayBuffer) => Promise<T>,
): Promise<T> {
  if (file.size === 0) throw new PdfUploadError('الملف فارغ. اختر ملف PDF يحتوي على صفحات.');
  if (file.size > maxBytes) throw new PdfUploadError('حجم الملف يتجاوز الحد المسموح (50 ميجابايت).');
  const bytes = await file.arrayBuffer();
  const header = new TextDecoder('latin1').decode(bytes.slice(0, 1024));
  if (!header.includes('%PDF-')) throw new PdfUploadError('الملف ليس PDF صالحًا؛ تغيير امتداد الملف لا يحوّله إلى PDF.');
  let doc: T;
  try { doc = await load(bytes); }
  catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'PasswordException') throw new PdfUploadError('ملف PDF محمي بكلمة مرور. افتح نسخة غير محمية ثم أعد رفعها.');
    throw new PdfUploadError('تعذر فتح PDF: الملف تالف أو غير مكتمل أو غير مدعوم. جرّب نسخة أخرى.');
  }
  if (!Number.isInteger(doc.numPages) || doc.numPages < 1) {
    await doc.loadingTask.destroy();
    throw new PdfUploadError('لا يحتوي PDF على صفحات صالحة للقراءة.');
  }
  return doc;
}

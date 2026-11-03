import React, { useState, useRef } from 'react';
import { useI18n } from '../i18n';
import { Book, ActivePage } from '../types';
import { localDocumentStore, LocalDocumentError, localDocumentErrorMessage } from '../services/local-document-store';
import { LOCAL_STORE_CONFIG, formatFileSize } from '../services/local-document-store/config';
import { inspectPdfUpload, PdfUploadError } from '../features/local-documents/services/pdf-upload';
import { pdfService } from '../services/pdfService';
import { AppIcon } from '../design-system';

interface AddBookProps {
  onAddBook: (newBook: Book) => void;
  onOpenBook: (bookId: string) => void;
  onNavigate: (page: ActivePage) => void;
}

type UploadState = 'idle' | 'processing' | 'success' | 'error';

export const AddBook: React.FC<AddBookProps> = ({
  onAddBook,
  onOpenBook,
  onNavigate,
}) => {
  const { t, isRTL } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStepText, setProcessingStepText] = useState('');
  const [createdBook, setCreatedBook] = useState<Book | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

  const processAndSavePdf = async (
    fileName: string,
    fileBlob: Blob,
    customSubject?: string
  ) => {
    // 1. File Size Verification (50MB Limit)
    if (fileBlob.size > LOCAL_STORE_CONFIG.MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `حجم الملف (${formatFileSize(fileBlob.size)}) يتجاوز الحد الأقصى المسموح به (${formatFileSize(
          LOCAL_STORE_CONFIG.MAX_FILE_SIZE_BYTES
        )}).`
      );
      setUploadState('error');
      return;
    }

    setUploadState('processing');
    setProcessingProgress(20);
    setProcessingStepText(t.addBook.processingSteps.reading);

    try {
      // 2. Validate PDF format via PDF.js
      setProcessingProgress(45);
      setProcessingStepText('جارٍ التحقق من بنية PDF وعدد صفحاته...');

      const pdfDoc = await inspectPdfUpload(fileBlob, LOCAL_STORE_CONFIG.MAX_FILE_SIZE_BYTES, pdfService.loadDocument);
      const pageCount = pdfDoc.numPages;
      await pdfDoc.loadingTask.destroy();

      setProcessingProgress(75);
      setProcessingStepText('جارٍ حفظ PDF الأصلي على هذا المتصفح...');

      const bookId = 'book_' + crypto.randomUUID();
      const cleanTitle = fileName.replace(/\.pdf$/i, '');

      // 3. Store in IndexedDB with separated metadata & Blob
      const savedMetadata = await localDocumentStore.saveDocument({
        id: bookId,
        fileName: cleanTitle,
        fileSize: fileBlob.size,
        mimeType: 'application/pdf',
        fileBlob: fileBlob,
        pageCount: pageCount,
        lastPage: 1,
        processingStatus: 'ready',
        subject: customSubject || 'منهاج دراسي محلي',
        summary: `كتاب دراسي محفوظ محلياً على هذا الجهاز (${pageCount} صفحة).`,
      });

      // 4. Create metadata object for Library UI
      const newBook: Book = {
        id: savedMetadata.id,
        source: 'local',
        title: savedMetadata.fileName,
        subject: savedMetadata.subject || 'منهاج دراسي محلي',
        gradeLevel: 'المرحلة الدراسية',
        totalPages: savedMetadata.pageCount,
        currentPage: 1,
        progressPercent: 0,
        status: 'local',
        lastOpened: 'محلي',
        summary: `كتاب دراسي محفوظ محلياً على هذا الجهاز (${savedMetadata.pageCount} صفحة).`,
        accentColor: '#4338ca',
        fileSize: savedMetadata.fileSize,
        sourceType: 'local-user-book',
        lastOpenedAt: savedMetadata.lastOpenedAt,
        mimeType: savedMetadata.mimeType,
        pages: [
          {
            pageNumber: 1,
            chapterTitle: '',
            lessonTitle: 'صفحة PDF 1',
            elements: [],
          },
        ],
      };

      setProcessingProgress(100);
      setProcessingStepText('جارٍ حفظ PDF الأصلي على هذا المتصفح...');
      setCreatedBook(newBook);
      onAddBook(newBook);
      setUploadState('success');
    } catch (err: unknown) {
      console.error('Failed to process PDF:', err);
      const errStr = err instanceof Error ? err.message : String(err);
      if (err instanceof PdfUploadError) {
        setErrorMessage(err.message);
      } else if (err instanceof LocalDocumentError) {
        setErrorMessage(localDocumentErrorMessage(err, isRTL));
      } else if (errStr.includes('Invalid PDF') || errStr.includes('format')) {
        setErrorMessage(t.errors.invalidPdf);
      } else {
        setErrorMessage(t.errors.readingError);
      }
      setUploadState('error');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage(t.errors.invalidPdf);
      setUploadState('error');
      return;
    }

    await processAndSavePdf(file.name, file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage(t.errors.invalidPdf);
      setUploadState('error');
      return;
    }

    await processAndSavePdf(file.name, file);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2 font-display">
          {t.addBook.pageTitle}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-sans">
          {t.addBook.pageSubtitle}
        </p>
      </div>

      {/* Upload State Card */}
      {uploadState === 'idle' && (
        <div className="space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".pdf,application/pdf"
            aria-label="ملف PDF للرفع"
            className="sr-only"
          />

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
              isDragOver
                ? 'border-indigo-600 bg-indigo-50/50 scale-[1.01]'
                : 'border-slate-300 hover:border-slate-400 bg-white'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <AppIcon name="upload" size="xl" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 font-display">
              {t.addBook.dragDropDesktop}
            </h3>

            <p className="text-xs text-slate-500 mb-6 font-sans">
              يدعم ملفات PDF المدرسية حتى {formatFileSize(LOCAL_STORE_CONFIG.MAX_FILE_SIZE_BYTES)}
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm hover:bg-slate-800 transition-all shadow-xs active:scale-[0.98] motion-reduce:transform-none"
            >
              {t.addBook.mobileUploadBtn}
            </button>
          </div>

          <p className="text-sm leading-7 text-slate-600 bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
            يُحفظ ملفك على هذا المتصفح فقط ولا يُرسل إلى خدمة ذكاء اصطناعي. بعد فتحه، حدّد اسم الدرس وصفحاته لإنشاء مراجعة استخراجية موثّقة. ملفات الصور دون نص تحتاج OCR غير متاح حاليًا، ولن نعرض محتوى بديلًا عنها.
          </p>
        </div>
      )}

      {/* Processing State */}
      {uploadState === 'processing' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-5 animate-pulse motion-reduce:animate-none">
            <AppIcon name="sparkles" size="lg" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1 font-display">
            {t.addBook.processingTitle}
          </h3>
          <p className="text-xs text-slate-500 mb-6 font-sans">{processingStepText}</p>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-3">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300 motion-reduce:transition-none"
              style={{ width: `${processingProgress}%` }}
            />
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {processingProgress}%
          </span>
        </div>
      )}

      {/* Success State */}
      {uploadState === 'success' && createdBook && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <AppIcon name="checkCircle" size="lg" />
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 font-display">
            {t.addBook.successTitle}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mb-6 font-sans">
            تم حفظ PDF الأصلي محليًا. افتحه لاستخراج النص والتحقق من الصفحات؛ حفظ الملف لا يعني نجاح استخراج نصه.
          </p>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-start mb-6">
            <span className="text-xs font-bold text-slate-800 block truncate font-display">
              {createdBook.title}
            </span>
            <span className="text-[11px] text-slate-500 font-sans">
              {createdBook.subject} · {createdBook.totalPages} {t.common.page} {createdBook.fileSize ? `· ${formatFileSize(createdBook.fileSize)}` : ''}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <button
              type="button"
              onClick={() => onOpenBook(createdBook.id)}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm hover:bg-slate-800 transition-all shadow-xs flex items-center justify-center gap-2 active:scale-[0.98] motion-reduce:transform-none"
            >
              <span>{t.addBook.successAction}</span>
              <AppIcon name={isRTL ? 'arrowLeft' : 'arrowRight'} size="sm" />
            </button>

            <button
              type="button"
              onClick={() => setUploadState('idle')}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 transition-colors active:scale-[0.98] motion-reduce:transform-none"
            >
              {t.localDocuments.addAnotherBook}
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {uploadState === 'error' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <AppIcon name="alert" size="lg" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-2 font-display">
            {t.addBook.errorTitle}
          </h3>
          <p role="alert" className="text-xs sm:text-sm text-slate-500 mb-6 font-sans">
            {errorMessage || t.addBook.errorDesc}
          </p>

          <button
            type="button"
            onClick={() => setUploadState('idle')}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mx-auto active:scale-[0.98] motion-reduce:transform-none"
          >
            <AppIcon name="refresh" size="sm" />
            <span>{t.addBook.errorRetry}</span>
          </button>
        </div>
      )}
    </div>
  );
};

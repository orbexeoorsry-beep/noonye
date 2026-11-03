import React from 'react';
import { StudentProgress, ActivePage } from '../types';
import { useI18n } from '../i18n';

interface ProgressPageProps {
  progress: StudentProgress;
  onOpenBookToPage: (bookId: string, pageNumber: number) => void;
  onNavigate: (page: ActivePage) => void;
}

export const ProgressPage: React.FC<ProgressPageProps> = () => {
  const { t, isRTL } = useI18n();

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
          {t.progress.pageTitle}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 font-sans">
          {isRTL
            ? 'لا تتوفر حاليًا بيانات تقدم فعلية موثوقة لهذا الطالب.'
            : 'Verified real progress data is not currently available for this student.'}
        </p>
      </div>

      <section
        aria-labelledby="progress-unavailable-title"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8 text-start"
      >
        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
          {isRTL ? 'بيانات تجريبية / غير موثقة' : 'Demo / unverified data'}
        </span>
        <h2 id="progress-unavailable-title" className="mt-4 text-lg sm:text-xl font-bold text-slate-900 font-display">
          {isRTL ? 'لا يمكن عرض تقدم فعلي الآن' : 'Real progress cannot be shown yet'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700 font-sans">
          {isRTL
            ? 'قد تجمع البيانات المتاحة بين أرقام تجريبية وأحداث حقيقية، لذلك لا يمكن اعتبارها أداءً فعليًا للطالب. لن نعرض أرقامًا أو مفاهيم أو أنشطة قد توحي بمستوى الطالب أو نقاط ضعفه.'
            : 'Available progress data may mix seeded demo metrics with real events, so it cannot be treated as actual student performance. We will not show metrics, concepts, or activity that could imply the student’s level or weaknesses.'}
        </p>
      </section>
    </main>
  );
};

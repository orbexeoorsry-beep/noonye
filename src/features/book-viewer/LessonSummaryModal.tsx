import React, { useState, useEffect } from 'react';
import { BookLesson } from '../../services/bookLessonsService';
import {
  lessonSummaryService,
  LessonSummary,
} from '../../services/lessonSummaryService';
import { AppIcon, IconButton } from '../../design-system';
import { useI18n } from '../../i18n';

interface LessonSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLessons: BookLesson[];
  bookTitle?: string;
}

export const LessonSummaryModal: React.FC<LessonSummaryModalProps> = ({
  isOpen,
  onClose,
  selectedLessons,
  bookTitle = 'منهاج نون الدراسي',
}) => {
  const { t, isRTL } = useI18n();

  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [summary, setSummary] = useState<LessonSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});

  const loadingSteps = isRTL
    ? [
        'قراءة وتحليل محتوى الصفحات والمواضيع المحددة...',
        'تحديد جوهر الدرس وأهم الأفكار والمفاهيم...',
        'استخلاص المصطلحات والتعريفات والقواعد الحاكمة...',
        'صياغة الأسئلة المراجعية وبناء التلخيص المنظم...'
      ]
    : [
        'Reading and analyzing page contents and selected topics...',
        'Identifying core lessons and key curriculum concepts...',
        'Extracting vital terminology, definitions, and rules...',
        'Formulating review questions and structuring final summary...'
      ];

  // Rotate loading steps description to look highly professional
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading && isOpen) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingSteps.length);
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isLoading, isOpen, isRTL]);

  // Generate summary when modal opens or selectedLessons changes
  useEffect(() => {
    if (isOpen && selectedLessons.length > 0) {
      setIsLoading(true);
      setError(null);
      setLoadingStep(0);
      setExpandedQuestions({});

      lessonSummaryService
        .generateSummary(selectedLessons, bookTitle)
        .then((res) => {
          setSummary(res);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Failed to generate summary:', err);
          setError(
            isRTL
              ? 'حدث خطأ أثناء إعداد التلخيص. يرجى المحاولة مرة أخرى.'
              : 'Failed to generate summary. Please try again.'
          );
          setIsLoading(false);
        });
    }
  }, [isOpen, selectedLessons, isRTL]);

  if (!isOpen) return null;

  const toggleQuestion = (index: number) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Rule: If lesson content is empty/extremely short, handle gracefully
  const isContentExtremelyShort = selectedLessons.length === 1 && selectedLessons[0].pageNumber === 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200 motion-reduce:animate-none">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200 motion-reduce:animate-none">
        {/* Header */}
        <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <AppIcon name="fileText" size="md" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  {isRTL ? 'ملخص مراجعة الدرس' : 'Lesson Study Summary'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 flex items-center gap-1 font-sans">
                  <AppIcon name="sparkles" size="xs" />
                  {isRTL ? 'تلخيص جيمني الذكي' : 'Gemini Summary'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1 font-sans">
                {selectedLessons.length === 1
                  ? selectedLessons[0].title
                  : `${isRTL ? 'ملخص مدمج لعدد' : 'Combined summary of'} ${selectedLessons.length} ${isRTL ? 'دروس محددة' : 'selected lessons'}`}
              </p>
            </div>
          </div>

          <IconButton
            name="close"
            iconSize="sm"
            variant="ghost"
            label={isRTL ? 'إغلاق' : 'Close'}
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] text-slate-400 hover:text-slate-700"
          />
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 font-sans">
          {isLoading ? (
            /* Loading State with rotating professional steps */
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <div className="w-12 h-12 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <AppIcon name="sparkles" size="xs" className="text-indigo-600 absolute animate-pulse" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-bold text-slate-800 font-display">
                  {isRTL ? 'جاري إعداد ورقة المراجعة والتلخيص...' : 'Preparing Study Summary...'}
                </h4>
                <p className="text-xs text-slate-500 min-h-[32px] leading-relaxed animate-pulse">
                  {loadingSteps[loadingStep]}
                </p>
              </div>
            </div>
          ) : error ? (
            /* Error State */
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AppIcon name="alert" size="md" />
              </div>
              <p className="text-xs font-bold text-slate-800">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
              >
                {isRTL ? 'الرجوع للقراءة' : 'Back to book'}
              </button>
            </div>
          ) : isContentExtremelyShort ? (
            /* Extremely short content warning */
            <div className="py-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <AppIcon name="lightbulb" size="md" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h4 className="text-sm font-bold text-slate-800 font-display">
                  {isRTL ? 'محتوى الدرس قصير جداً' : 'Lesson Content is Too Short'}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isRTL
                    ? 'محتوى الدرس قصير جداً لإنشاء ملخص مستقل. يمكنك مراجعته مباشرة.'
                    : 'This lesson is too short to generate a separate summary. You can study it directly from the page.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
              >
                {isRTL ? 'حسناً، الانتقال للكتاب' : 'Okay, back to book'}
              </button>
            </div>
          ) : summary ? (
            /* Summary Render */
            <div className="space-y-6">
              {/* Overview / Pages Banner */}
              <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-indigo-700 font-bold font-sans">
                  <span className="flex items-center gap-1">
                    <AppIcon name="education" size="xs" />
                    {summary.lessonTitles.join(' · ')}
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                    {summary.sourcePages}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 font-display">
                  {summary.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  {summary.overview}
                </p>
              </div>

              {/* Dynamic Optional Sections */}
              <div className="space-y-5">
                {summary.sections
                  .filter((sec) => sec.visible && sec.items.length > 0)
                  .map((sec, idx) => {
                    // Choose nice colors based on section type
                    let accentBg = 'bg-slate-50 text-slate-700 border-slate-200';
                    let iconName: 'education' | 'check' | 'lightbulb' | 'fileText' | 'award' | 'layers' | 'math' = 'fileText';

                    if (sec.type.includes('خلاصة')) {
                      accentBg = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                      iconName = 'check';
                    } else if (sec.type.includes('المصطلحات') || sec.type.includes('تعريف')) {
                      accentBg = 'bg-blue-50 text-blue-800 border-blue-100';
                      iconName = 'education';
                    } else if (sec.type.includes('قوانين') || sec.type.includes('معادلات') || sec.type.includes('قواعد')) {
                      accentBg = 'bg-purple-50 text-purple-800 border-purple-100';
                      iconName = 'math';
                    } else if (sec.type.includes('تستحق') || sec.type.includes('أهم')) {
                      accentBg = 'bg-amber-50 text-amber-800 border-amber-100';
                      iconName = 'lightbulb';
                    }

                    return (
                      <div key={idx} className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-display">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${accentBg}`}>
                              <AppIcon name={iconName} size="xs" />
                            </span>
                            {sec.title}
                          </h5>
                          <span className="text-[10px] text-slate-400 font-sans">{sec.type}</span>
                        </div>
                        <ul className="p-4 space-y-2.5 text-xs text-slate-600 leading-relaxed font-sans list-disc pr-4 pl-1">
                          {sec.items.map((item, itemIdx) => (
                            <li key={itemIdx} className="marker:text-indigo-500">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
              </div>

              {/* Review Questions & Answers */}
              {summary.reviewQuestions && summary.reviewQuestions.length > 0 && (
                <div className="space-y-3.5">
                  <h4 className="text-sm font-extrabold text-slate-900 font-display flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <AppIcon name="help" size="sm" className="text-indigo-600" />
                    {isRTL ? 'أسئلة تساعدك على مراجعة الدرس' : 'Review Q&A to Study This Lesson'}
                  </h4>

                  <div className="space-y-2.5">
                    {summary.reviewQuestions.map((q, qIdx) => {
                      const isExpanded = Boolean(expandedQuestions[qIdx]);
                      return (
                        <div
                          key={qIdx}
                          onClick={() => toggleQuestion(qIdx)}
                          className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 rounded-xl p-3 cursor-pointer transition-colors text-right"
                        >
                          <div className="flex items-start justify-between gap-3 select-none">
                            <p className="text-xs font-bold text-slate-800 leading-relaxed font-display">
                              {q.question}
                            </p>
                            <span className="text-slate-400 shrink-0 mt-0.5">
                              <AppIcon name={isExpanded ? 'chevronUp' : 'chevronDown'} size="xs" />
                            </span>
                          </div>

                          {isExpanded && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/50 animate-in slide-in-from-top-1 duration-150">
                              <p className="text-xs text-indigo-700 font-semibold font-sans leading-relaxed">
                                {q.answer}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Review / Tip */}
              {summary.quickReview && (
                <div className="border border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <AppIcon name="lightbulb" size="sm" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-slate-900 font-display">
                      {isRTL ? 'نصيحة مراجعة سريعة' : 'Quick Study Tip'}
                    </h5>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                      {summary.quickReview}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Footer Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <AppIcon name="bookMarked" size="sm" />
                  <span>{isRTL ? 'فهمت الملخص، العودة للقراءة 📖' : 'I understand, back to reading 📖'}</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

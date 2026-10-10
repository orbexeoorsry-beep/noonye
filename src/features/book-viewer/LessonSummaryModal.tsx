import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { BookLesson } from '../../services/bookLessonsService';
import {
  lessonSummaryService,
  LessonSummary,
} from '../../services/lessonSummaryService';
import { AppIcon, IconButton } from '../../design-system';
import { useI18n } from '../../i18n';
import { isFeatureEnabled } from '../../config/feature-flags';

interface LessonSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLessons: BookLesson[];
  bookTitle?: string;
  pdfDoc?: pdfjsLib.PDFDocumentProxy | null;
  onJumpToPage?: (pageNumber: number) => void;
}

export const LessonSummaryModal: React.FC<LessonSummaryModalProps> = ({
  isOpen,
  onClose,
  selectedLessons,
  bookTitle = 'منهاج نون الدراسي',
  pdfDoc = null,
  onJumpToPage,
}) => {
  const { isRTL } = useI18n();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const lessonsEnabled = isFeatureEnabled('lessonsEnabled');
  const lessonSummaryEnabled = isFeatureEnabled('lessonSummaryEnabled');
  const isModalActive = isOpen && lessonsEnabled && lessonSummaryEnabled;

  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [summary, setSummary] = useState<LessonSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  // By default, expand all review answers so all content is visible while scrolling
  const [collapsedQuestions, setCollapsedQuestions] = useState<Record<number, boolean>>({});
  const [areAllAnswersHidden, setAreAllAnswersHidden] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(true);

  const loadingSteps = isRTL
    ? [
        'قراءة وتحليل كامل محتوى الصفحات والدروس المحددة...',
        'تحديد جوهر كل درس واستخلاص الأفكار والمفاهيم الكاملة...',
        'تنظيم المصطلحات والتعريفات والقوانين والخطوات والأمثلة...',
        'صياغة أسئلة المراجعة وإعداد الملخص الشامل القابل للتمرير...'
      ]
    : [
        'Reading and analyzing full page contents and selected lessons...',
        'Identifying core lesson concepts and full curriculum details...',
        'Organizing terminology, definitions, formulas, steps, and examples...',
        'Formulating review Q&A and building the complete scrollable summary...'
      ];

  // Rotate loading steps description
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading && isModalActive) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingSteps.length);
      }, 1100);
    }
    return () => clearInterval(interval);
  }, [isLoading, isModalActive, loadingSteps.length]);

  // Check scroll position to show/hide "Scroll down for more" indicator
  const handleScrollCheck = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nextCanScroll = remaining > 60;
    setCanScrollDown((prev) => (prev !== nextCanScroll ? nextCanScroll : prev));
  }, []);

  const selectedLessonsKey = selectedLessons.map((l) => l.id).join(',');
  const lastSummaryKeyRef = useRef<string>('');
  const selectedLessonsRef = useRef(selectedLessons);
  selectedLessonsRef.current = selectedLessons;

  // Generate summary when modal opens or selectedLessons changes
  useEffect(() => {
    if (!isModalActive) {
      lastSummaryKeyRef.current = '';
      return;
    }

    const currentLessons = selectedLessonsRef.current;
    if (currentLessons.length === 0) return;

    const reqKey = `${bookTitle}::${selectedLessonsKey}`;
    if (lastSummaryKeyRef.current === reqKey) return;
    lastSummaryKeyRef.current = reqKey;

    let isCancelled = false;
    setIsLoading(true);
    setError(null);
    setLoadingStep(0);
    setCollapsedQuestions({});
    setAreAllAnswersHidden(false);
    setCanScrollDown(true);

    lessonSummaryService
      .generateSummary(currentLessons, bookTitle, pdfDoc)
      .then((res) => {
        if (isCancelled) return;
        setSummary(res);
        setIsLoading(false);
        setTimeout(handleScrollCheck, 150);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('Failed to generate summary:', err);
        setError(
          isRTL
            ? 'حدث خطأ أثناء إعداد التلخيص. يرجى المحاولة مرة أخرى.'
            : 'Failed to generate summary. Please try again.'
        );
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isModalActive, selectedLessonsKey, bookTitle, pdfDoc, isRTL, handleScrollCheck]);

  if (!isModalActive) return null;

  const toggleQuestion = (index: number) => {
    setCollapsedQuestions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const toggleAllAnswers = () => {
    if (!summary?.reviewQuestions) return;
    const nextHideState = !areAllAnswersHidden;
    setAreAllAnswersHidden(nextHideState);
    const updated: Record<number, boolean> = {};
    summary.reviewQuestions.forEach((_, idx) => {
      updated[idx] = nextHideState;
    });
    setCollapsedQuestions(updated);
  };

  const handleScrollDownChunk = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({
      top: Math.max(280, Math.floor(el.clientHeight * 0.75)),
      behavior: 'smooth',
    });
  };

  const scrollToSection = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const isContentExtremelyShort =
    selectedLessons.length === 1 && selectedLessons[0].pageNumber === 0;

  const visibleSections =
    summary?.sections.filter((sec) => sec.visible && sec.items && sec.items.length > 0) || [];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 motion-reduce:animate-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl h-[92vh] sm:h-[90vh] max-h-[94vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200 motion-reduce:animate-none">
        {/* ========================================================= */}
        {/* Sticky Modal Header */}
        {/* ========================================================= */}
        <header className="shrink-0 px-4 sm:px-6 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/95">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <AppIcon name="fileText" size="md" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 font-display">
                  {isRTL ? 'ملخص مراجعة الدرس الشامل' : 'Comprehensive Lesson Summary'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 flex items-center gap-1 font-sans">
                  <AppIcon name="sparkles" size="xs" />
                  {isRTL ? 'تلخيص جيمني الذكي' : 'Gemini Summary'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate font-sans mt-0.5">
                {selectedLessons.length === 1
                  ? selectedLessons[0].title
                  : `${isRTL ? 'ملخص تفصيلي شامل لعدد' : 'Complete summary of'} ${selectedLessons.length} ${isRTL ? 'دروس محددة' : 'selected lessons'}`}
              </p>
            </div>
          </div>

          <IconButton
            name="close"
            iconSize="sm"
            variant="ghost"
            label={isRTL ? 'إغلاق' : 'Close'}
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] text-slate-400 hover:text-slate-700 shrink-0"
          />
        </header>

        {/* ========================================================= */}
        {/* Quick Section Navigation Bar (when summary is ready) */}
        {/* ========================================================= */}
        {!isLoading && !error && summary && visibleSections.length > 1 && (
          <div className="shrink-0 px-4 sm:px-6 py-2 bg-white border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 ml-1 font-sans">
              {isRTL ? 'أقسام الملخص:' : 'Sections:'}
            </span>
            {visibleSections.map((sec, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToSection(`summary-sec-${idx}`)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-[11px] font-semibold transition-colors border border-slate-200/60 font-sans cursor-pointer"
              >
                {sec.title}
              </button>
            ))}
            {summary.reviewQuestions && summary.reviewQuestions.length > 0 && (
              <button
                type="button"
                onClick={() => scrollToSection('summary-review-questions')}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-colors border border-indigo-200/60 font-sans cursor-pointer"
              >
                {isRTL ? `أسئلة المراجعة (${summary.reviewQuestions.length})` : 'Review Q&A'}
              </button>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* Freely Scrollable Content Body (Scrolls to the very end) */}
        {/* ========================================================= */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScrollCheck}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y scroll-smooth p-4 sm:p-6 font-sans select-text"
        >
          {isLoading ? (
            /* Loading State with rotating professional steps */
            <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="w-14 h-14 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <AppIcon name="sparkles" size="sm" className="text-indigo-600 absolute animate-pulse" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h4 className="text-sm sm:text-base font-bold text-slate-800 font-display">
                  {isRTL ? 'جاري إعداد الملخص الدراسي الشامل...' : 'Preparing Complete Study Summary...'}
                </h4>
                <p className="text-xs text-slate-500 min-h-[36px] leading-relaxed animate-pulse">
                  {loadingSteps[loadingStep]}
                </p>
              </div>
            </div>
          ) : error ? (
            /* Error State */
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AppIcon name="alert" size="md" />
              </div>
              <p className="text-xs font-bold text-slate-800">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
              >
                {isRTL ? 'الرجوع للقراءة' : 'Back to book'}
              </button>
            </div>
          ) : isContentExtremelyShort ? (
            /* Extremely short content warning */
            <div className="py-12 text-center space-y-4">
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
                className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
              >
                {isRTL ? 'حسناً، الانتقال للكتاب' : 'Okay, back to book'}
              </button>
            </div>
          ) : summary ? (
            /* Complete Scrollable Summary Document */
            <div className="space-y-6 pb-8">
              {/* 1. Overview & Selected Lessons Banner */}
              <div className="bg-gradient-to-br from-indigo-50/90 via-indigo-50/50 to-slate-50 border border-indigo-100 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-indigo-700 font-bold font-sans">
                  <span className="flex items-center gap-1.5">
                    <AppIcon name="education" size="sm" />
                    <span>
                      {selectedLessons.length === 1
                        ? summary.lessonTitles[0]
                        : `يشمل ${selectedLessons.length} دروس محددة`}
                    </span>
                  </span>
                  <span className="bg-white px-2.5 py-1 rounded-lg border border-indigo-100 text-[11px] font-mono text-indigo-800 shadow-2xs">
                    {summary.sourcePages}
                  </span>
                </div>

                {/* List of selected lesson pills when multiple lessons are summarized */}
                {selectedLessons.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedLessons.map((lesson, lIdx) => (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => {
                          if (onJumpToPage) {
                            onJumpToPage(lesson.pageNumber);
                            onClose();
                          }
                        }}
                        className="text-[11px] bg-white hover:bg-indigo-600 text-slate-700 hover:text-white border border-indigo-200/80 px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
                        title={`الانتقال إلى صفحة ${lesson.pageNumber}`}
                      >
                        <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] flex items-center justify-center font-bold">
                          {lIdx + 1}
                        </span>
                        <span>{lesson.title}</span>
                        <span className="text-[10px] opacity-75 font-mono">
                          (ص {lesson.pageNumber})
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <h4 className="text-base sm:text-lg font-extrabold text-slate-900 font-display leading-snug">
                  {summary.title}
                </h4>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
                  {summary.overview}
                </p>
              </div>

              {/* 2. All Comprehensive Summary Sections */}
              <div className="space-y-5">
                {visibleSections.map((sec, idx) => {
                  let accentBg = 'bg-slate-100 text-slate-700 border-slate-200';
                  let headerBg = 'bg-slate-50/90 border-slate-100';
                  let bulletColor = 'bg-indigo-600';
                  let iconName:
                    | 'education'
                    | 'check'
                    | 'lightbulb'
                    | 'fileText'
                    | 'award'
                    | 'layers'
                    | 'math' = 'fileText';

                  if (sec.type.includes('خلاصة')) {
                    accentBg = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                    headerBg = 'bg-emerald-50/50 border-emerald-100';
                    bulletColor = 'bg-emerald-600';
                    iconName = 'check';
                  } else if (sec.type.includes('المصطلحات') || sec.type.includes('تعريف')) {
                    accentBg = 'bg-blue-100 text-blue-800 border-blue-200';
                    headerBg = 'bg-blue-50/50 border-blue-100';
                    bulletColor = 'bg-blue-600';
                    iconName = 'education';
                  } else if (
                    sec.type.includes('قوانين') ||
                    sec.type.includes('معادلات') ||
                    sec.type.includes('قواعد')
                  ) {
                    accentBg = 'bg-purple-100 text-purple-800 border-purple-200';
                    headerBg = 'bg-purple-50/50 border-purple-100';
                    bulletColor = 'bg-purple-600';
                    iconName = 'math';
                  } else if (sec.type.includes('مقارن')) {
                    accentBg = 'bg-indigo-100 text-indigo-800 border-indigo-200';
                    headerBg = 'bg-indigo-50/50 border-indigo-100';
                    bulletColor = 'bg-indigo-600';
                    iconName = 'layers';
                  } else if (sec.type.includes('خطوات') || sec.type.includes('تسلسل')) {
                    accentBg = 'bg-cyan-100 text-cyan-800 border-cyan-200';
                    headerBg = 'bg-cyan-50/50 border-cyan-100';
                    bulletColor = 'bg-cyan-600';
                    iconName = 'layers';
                  } else if (sec.type.includes('أمثلة')) {
                    accentBg = 'bg-teal-100 text-teal-800 border-teal-200';
                    headerBg = 'bg-teal-50/50 border-teal-100';
                    bulletColor = 'bg-teal-600';
                    iconName = 'award';
                  } else if (sec.type.includes('تستحق') || sec.type.includes('أهم')) {
                    accentBg = 'bg-amber-100 text-amber-800 border-amber-200';
                    headerBg = 'bg-amber-50/50 border-amber-100';
                    bulletColor = 'bg-amber-600';
                    iconName = 'lightbulb';
                  }

                  return (
                    <section
                      key={idx}
                      id={`summary-sec-${idx}`}
                      className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs scroll-mt-4"
                    >
                      <div
                        className={`px-4 sm:px-5 py-3 border-b flex items-center justify-between gap-2 ${headerBg}`}
                      >
                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                          <span
                            className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 ${accentBg}`}
                          >
                            <AppIcon name={iconName} size="xs" />
                          </span>
                          <span>{sec.title}</span>
                        </h5>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/80 border border-slate-200/60 text-slate-500 font-sans shrink-0">
                          {sec.type}
                        </span>
                      </div>

                      <div className="p-4 sm:p-5 space-y-3">
                        {sec.items.map((item, itemIdx) => (
                          <div
                            key={itemIdx}
                            className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans bg-slate-50/60 hover:bg-slate-50 p-3 rounded-xl border border-slate-100 transition-colors"
                          >
                            <span
                              className={`w-2 h-2 rounded-full mt-2 shrink-0 ${bulletColor}`}
                            />
                            <p className="flex-1 whitespace-pre-line">{item}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>

              {/* 3. Review Questions & Answers (All expanded by default so full content is visible) */}
              {summary.reviewQuestions && summary.reviewQuestions.length > 0 && (
                <section
                  id="summary-review-questions"
                  className="space-y-4 pt-2 scroll-mt-4"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3 flex-wrap">
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900 font-display flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                        <AppIcon name="help" size="sm" />
                      </span>
                      <span>
                        {isRTL
                          ? `أسئلة تساعدك على مراجعة الدرس (${summary.reviewQuestions.length} أسئلة)`
                          : `Review Q&A (${summary.reviewQuestions.length})`}
                      </span>
                    </h4>

                    <button
                      type="button"
                      onClick={toggleAllAnswers}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                      {areAllAnswersHidden
                        ? isRTL
                          ? 'إظهار جميع الإجابات'
                          : 'Show All Answers'
                        : isRTL
                        ? 'إخفاء الإجابات لاختبار نفسك'
                        : 'Hide Answers to Self-Test'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {summary.reviewQuestions.map((q, qIdx) => {
                      const isCollapsed = Boolean(collapsedQuestions[qIdx]);
                      return (
                        <div
                          key={qIdx}
                          onClick={() => toggleQuestion(qIdx)}
                          className="bg-white hover:bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 cursor-pointer transition-all shadow-2xs text-right"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">
                                {qIdx + 1}
                              </span>
                              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed font-display">
                                {q.question}
                              </p>
                            </div>
                            <span className="text-slate-400 shrink-0 mt-1">
                              <AppIcon
                                name={isCollapsed ? 'chevronDown' : 'chevronUp'}
                                size="xs"
                              />
                            </span>
                          </div>

                          {!isCollapsed && (
                            <div className="mt-3 pt-3 border-t border-slate-100 pr-8">
                              <div className="bg-indigo-50/60 border border-indigo-100/80 rounded-xl p-3">
                                <span className="text-[11px] font-bold text-indigo-800 block mb-1">
                                  {isRTL ? 'الإجابة النموذجية:' : 'Model Answer:'}
                                </span>
                                <p className="text-xs sm:text-sm text-slate-800 font-medium font-sans leading-relaxed whitespace-pre-line">
                                  {q.answer}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 4. Quick Review / Conclusion Tip */}
              {summary.quickReview && (
                <div className="border border-amber-200/90 rounded-2xl p-4 sm:p-5 bg-amber-50/60 flex items-start gap-3.5 shadow-2xs">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <AppIcon name="lightbulb" size="sm" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <h5 className="text-xs sm:text-sm font-bold text-amber-950 font-display">
                      {isRTL ? 'خلاصة المراجعة السريعة' : 'Quick Study Conclusion'}
                    </h5>
                    <p className="text-xs sm:text-sm text-amber-900 leading-relaxed font-sans whitespace-pre-line">
                      {summary.quickReview}
                    </p>
                  </div>
                </div>
              )}

              {/* 5. End-of-Summary Completion Button */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full min-h-[48px] rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <AppIcon name="bookMarked" size="sm" />
                  <span>
                    {isRTL
                      ? 'وصلت لنهاية الملخص — العودة للقراءة 📖'
                      : 'End of Summary — Back to reading 📖'}
                  </span>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* ========================================================= */}
        {/* Floating "Scroll Down for More" Indicator when not at bottom */}
        {/* ========================================================= */}
        {!isLoading && !error && summary && canScrollDown && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <button
              type="button"
              onClick={handleScrollDownChunk}
              className="pointer-events-auto px-4 py-2 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-bold shadow-lg border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer animate-bounce"
            >
              <span>{isRTL ? 'مرّر للأسفل لقراءة باقي الملخص' : 'Scroll down for more'}</span>
              <AppIcon name="chevronDown" size="xs" />
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* Sticky Footer Controls */}
        {/* ========================================================= */}
        <footer className="shrink-0 px-4 sm:px-6 py-3 border-t border-slate-200/80 bg-slate-50/95 flex items-center justify-between gap-2 font-sans">
          <div className="text-[11px] text-slate-500 font-medium">
            {summary && !isLoading
              ? isRTL
                ? `يحتوي الملخص على ${visibleSections.length} أقسام علمية و ${summary.reviewQuestions?.length || 0} أسئلة مراجعة`
                : `${visibleSections.length} sections & ${summary.reviewQuestions?.length || 0} review questions`
              : isRTL
              ? 'ملخص شامل قابل للتمرير حتى النهاية'
              : 'Scrollable comprehensive summary'}
          </div>

          <div className="flex items-center gap-2">
            {selectedLessons.length === 1 && onJumpToPage && (
              <button
                type="button"
                onClick={() => {
                  onJumpToPage(selectedLessons[0].pageNumber);
                  onClose();
                }}
                className="min-h-[40px] px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <AppIcon name="library" size="xs" />
                <span>{isRTL ? 'صفحة الدرس' : 'Lesson Page'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {isRTL ? 'إغلاق الملخص' : 'Close'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

import React, { useRef, useEffect } from 'react';
import { BookLesson } from '../../services/bookLessonsService';
import { AppIcon, IconButton } from '../../design-system';
import { useI18n } from '../../i18n';
import { isFeatureEnabled } from '../../config/feature-flags';

interface LessonsBarProps {
  lessons: BookLesson[];
  activeLesson: BookLesson | null;
  currentPage: number;
  selectedLessonIds: string[];
  onToggleLessonSelect: (lessonId: string, e?: React.MouseEvent) => void;
  onSelectLesson: (lesson: BookLesson) => void;
  onStartQuiz: (lessonsToTest: BookLesson[]) => void;
  onStartSummary: (lessonsToSummarize: BookLesson[]) => void;
}

export const LessonsBar: React.FC<LessonsBarProps> = ({
  lessons,
  activeLesson,
  currentPage,
  selectedLessonIds,
  onToggleLessonSelect,
  onSelectLesson,
  onStartQuiz,
  onStartSummary,
}) => {
  const { t, format, isRTL } = useI18n();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activePillRef = useRef<HTMLDivElement>(null);

  const lessonsEnabled = isFeatureEnabled('lessonsEnabled');
  const lessonTestsEnabled = isFeatureEnabled('lessonTestsEnabled');
  const lessonSummaryEnabled = isFeatureEnabled('lessonSummaryEnabled');
  const canSelectLessonsForActions = lessonTestsEnabled || lessonSummaryEnabled;

  // Auto-scroll the active lesson pill into view smoothly
  useEffect(() => {
    if (activePillRef.current && scrollContainerRef.current) {
      activePillRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeLesson?.id, currentPage]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollContainerRef.current.scrollBy({
        left: isRTL ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!lessonsEnabled || !lessons || lessons.length === 0) {
    return null;
  }

  const selectedLessons = lessons.filter((l) => selectedLessonIds.includes(l.id));

  return (
    <div className="relative flex items-center w-full max-w-3xl min-w-0 gap-1.5">
      {/* Scroll Left Button */}
      <IconButton
        name={isRTL ? 'chevronRight' : 'chevronLeft'}
        label={isRTL ? 'التمرير لليمين' : 'Scroll left'}
        variant="ghost"
        iconSize="sm"
        onClick={() => handleScroll('left')}
        className="hidden sm:flex shrink-0 min-h-[44px] min-w-[44px] text-slate-400 hover:text-slate-800"
      />

      {/* Horizontal Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto scroll-smooth py-1 px-1.5 no-scrollbar touch-pan-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {lessons.map((lesson) => {
          const isActive = activeLesson?.id === lesson.id;
          const isCurrentPage =
            currentPage >= lesson.pageNumber &&
            (lesson.endPageNumber ? currentPage <= lesson.endPageNumber : true);
          const isChecked = canSelectLessonsForActions && selectedLessonIds.includes(lesson.id);

          return (
            <div
              key={lesson.id}
              ref={isActive ? activePillRef : null}
              className={`shrink-0 min-h-[40px] px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap border select-none ${
                isActive || isCurrentPage
                  ? 'bg-indigo-600 text-white font-bold shadow-xs border-indigo-500 ring-1 ring-indigo-400/40'
                  : isChecked
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400/30'
                  : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 border-slate-200/70'
              }`}
            >
              {/* Very Small Checkbox Square when lessonTestsEnabled or lessonSummaryEnabled is active */}
              {canSelectLessonsForActions && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLessonSelect(lesson.id, e);
                  }}
                  className={`w-4 h-4 rounded-[4px] flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
                    isChecked
                      ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs scale-105'
                      : isActive || isCurrentPage
                      ? 'border-indigo-300/80 bg-indigo-700/60 hover:bg-indigo-500 text-transparent hover:text-indigo-200'
                      : 'border-slate-300 bg-white hover:border-indigo-500 text-transparent hover:text-slate-400'
                  }`}
                  title={
                    isChecked
                      ? 'إلغاء تحديد هذا الدرس'
                      : 'وضع إشارة صح (✅) لتضمين الدرس'
                  }
                  aria-label={`تحديد ${lesson.title}`}
                >
                  {isChecked ? (
                    <AppIcon name="check" size="xs" strokeWidth={3.5} />
                  ) : (
                    <span className="w-2 h-2 rounded-[2px] opacity-0 hover:opacity-40 bg-slate-400" />
                  )}
                </button>
              )}

              {/* Lesson Title Clickable to navigate to page in the book */}
              <button
                type="button"
                onClick={() => onSelectLesson(lesson)}
                className="flex items-center gap-1.5 text-right hover:opacity-90 transition-opacity"
                title={`${lesson.title} - الانتقال للصفحة ${lesson.pageNumber}`}
              >
                <span className="truncate max-w-[140px] sm:max-w-[180px] md:max-w-[220px]">
                  {lesson.title}
                </span>

                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    isActive || isCurrentPage
                      ? 'bg-indigo-700/80 text-indigo-100'
                      : isChecked
                      ? 'bg-emerald-200/80 text-emerald-800'
                      : 'bg-slate-200/80 text-slate-500'
                  }`}
                >
                  ص {lesson.pageNumber}
                </span>
              </button>

              {/* Quick direct Quiz button for this individual lesson */}
              {lessonTestsEnabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartQuiz([lesson]);
                  }}
                  className={`p-1 rounded-lg transition-colors ml-0.5 flex items-center justify-center min-h-[28px] min-w-[28px] ${
                    isActive || isCurrentPage
                      ? 'text-indigo-200 hover:text-white hover:bg-indigo-700/80'
                      : isChecked
                      ? 'text-emerald-700 hover:text-emerald-950 hover:bg-emerald-200/70'
                      : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-200'
                  }`}
                  title={`بدء اختبار في (${lesson.title}) كامل`}
                  aria-label={`بدء اختبار ${lesson.title}`}
                >
                  <AppIcon name="help" size="sm" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      <IconButton
        name={isRTL ? 'chevronLeft' : 'chevronRight'}
        label={isRTL ? 'التمرير لليسار' : 'Scroll right'}
        variant="ghost"
        iconSize="sm"
        onClick={() => handleScroll('right')}
        className="hidden sm:flex shrink-0 min-h-[44px] min-w-[44px] text-slate-400 hover:text-slate-800"
      />

      {/* Primary Action Buttons: Start Multi-Lesson Quiz & Lesson Summary when 1 or more lessons are checked with ✅ */}
      {canSelectLessonsForActions && selectedLessons.length > 0 && (
        <div className="flex flex-col gap-1.5 shrink-0 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* 1. اختبار الدروس */}
          {lessonTestsEnabled && (
            <button
              type="button"
              onClick={() => onStartQuiz(selectedLessons)}
              className="min-h-[40px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 w-full"
              title={`بدء اختبار شامل في ${selectedLessons.length} دروس محددة`}
            >
              <AppIcon name="sparkles" size="sm" className="text-amber-300 animate-pulse motion-reduce:animate-none" />
              <span>
                {selectedLessons.length === 1
                  ? t.viewer.lessonQuizSingle
                  : format(t.viewer.lessonQuizMulti, { count: selectedLessons.length })}
              </span>
            </button>
          )}

          {/* 2. ملخص الدرس */}
          {lessonSummaryEnabled && (
            <button
              type="button"
              onClick={() => onStartSummary(selectedLessons)}
              className="min-h-[40px] px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 w-full"
              title={`عرض ملخص مخصص شامل في ${selectedLessons.length} دروس محددة`}
            >
              <AppIcon name="fileText" size="sm" className="text-white" />
              <span>
                {selectedLessons.length === 1
                  ? t.viewer.lessonSummarySingle
                  : format(t.viewer.lessonSummaryMulti, { count: selectedLessons.length })}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};


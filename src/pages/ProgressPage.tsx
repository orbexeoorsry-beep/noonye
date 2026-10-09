import React from 'react';
import { StudentProgress, ActivePage } from '../types';
import { useI18n } from '../i18n';
import { AppIcon, IconName } from '../design-system';

interface ProgressPageProps {
  progress: StudentProgress;
  onOpenBookToPage: (bookId: string, pageNumber: number) => void;
  onNavigate: (page: ActivePage) => void;
}

export const ProgressPage: React.FC<ProgressPageProps> = ({
  progress,
  onOpenBookToPage,
  onNavigate,
}) => {
  const { t, isRTL } = useI18n();

  const statCards: {
    label: string;
    value: string | number;
    suffix: string;
    iconName: IconName;
    color: string;
  }[] = [
    {
      label: t.progress.statPages,
      value: progress.totalPagesRead,
      suffix: isRTL ? 'صفحة' : 'pages',
      iconName: 'library',
      color: 'text-blue-600',
    },
    {
      label: t.progress.statLessons,
      value: progress.lessonsReviewed,
      suffix: isRTL ? 'درس' : 'lessons',
      iconName: 'layers',
      color: 'text-indigo-600',
    },
    {
      label: t.progress.statQuizzes,
      value: progress.quizzesCompleted,
      suffix: isRTL ? 'سؤال' : 'quizzes',
      iconName: 'checkCircle',
      color: 'text-emerald-600',
    },
    {
      label: t.progress.statAccuracy,
      value: `${progress.quizzesAccuracy}%`,
      suffix: isRTL ? 'دقة الاستيعاب' : 'accuracy',
      iconName: 'progress',
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
          {t.progress.pageTitle}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 font-sans">
          {t.progress.pageSubtitle}
        </p>
      </div>

      {/* Top Metric Cards (Clean, unboxed, tabular numbers) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs text-start"
          >
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <span className="text-xs font-medium text-slate-500 font-sans">{stat.label}</span>
              <AppIcon name={stat.iconName} size="sm" className={stat.color} />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              {stat.value}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block font-sans">
              {stat.suffix}
            </span>
          </div>
        ))}
      </div>

      {/* Concepts Needing Review Section */}
      <div className="mb-10">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <AppIcon name="alert" size="md" className="text-amber-600" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-display">
              {t.progress.conceptsNeedingReviewTitle}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-sans">
            {t.progress.conceptsNeedingReviewDesc}
          </p>
        </div>

        <div className="space-y-3">
          {progress.conceptsNeedingReview.map((concept) => (
            <div
              key={concept.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-start"
            >
              <div>
                {/* Unboxed Metadata */}
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5 font-sans">
                  <span className="font-semibold text-slate-700">{concept?.subject || (isRTL ? 'المادة' : 'Subject')}</span>
                  <span aria-hidden="true">·</span>
                  <span>{t.common.page} {concept?.pageNumber || 1}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`font-medium ${
                      concept.difficulty === 'hard'
                        ? 'text-amber-700'
                        : concept.difficulty === 'medium'
                        ? 'text-indigo-600'
                        : 'text-slate-600'
                    }`}
                  >
                    {concept.difficulty === 'hard'
                      ? t.progress.difficultyHard
                      : concept.difficulty === 'medium'
                      ? t.progress.difficultyMedium
                      : t.progress.difficultyEasy}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1 font-display">
                  {concept.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  {concept.reason}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenBookToPage(concept.bookId, concept.pageNumber)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 active:scale-[0.98] motion-reduce:transform-none"
              >
                <span>{t.progress.reviewNow}</span>
                <AppIcon name={isRTL ? 'arrowLeft' : 'arrowRight'} size="xs" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity Log */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AppIcon name="award" size="sm" className="text-slate-500" />
          <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
            {t.progress.recentActivityTitle}
          </h2>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-2xs">
          {progress.recentActivities.map((act) => (
            <div key={act.id} className="p-4 flex items-center justify-between gap-3 text-start font-sans">
              <div className="truncate">
                <span className="text-xs font-bold text-slate-800 block truncate">
                  {act.action}
                </span>
                <span className="text-[11px] text-slate-500">
                  {act.bookTitle} · {t.common.page} {act.pageNumber}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 shrink-0 font-medium whitespace-nowrap">
                {act.timeAgo}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

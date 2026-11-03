import React from 'react';
import { useI18n } from '../i18n';
import { ActivePage, Book } from '../types';
import { AppIcon } from '../design-system';
import { isFeatureEnabled } from '../config/feature-flags';

interface HomeProps {
  onNavigate: (page: ActivePage) => void;
  onOpenBook: (bookId: string) => void;
  featuredBook?: Book | null;
}

export const Home: React.FC<HomeProps> = ({ onNavigate, onOpenBook, featuredBook }) => {
  const { t, isRTL } = useI18n();
  const localBooksEnabled = isFeatureEnabled('localBooksEnabled');
  const bookProgress = featuredBook
    ? Math.max(0, Math.min(100, Number.isFinite(featuredBook.progressPercent) ? featuredBook.progressPercent : 0))
    : 0;

  const features = [
    { title: t.home.feature1Title, description: t.home.feature1Desc },
    { title: t.home.feature2Title, description: t.home.feature2Desc },
    { title: t.home.feature3Title, description: t.home.feature3Desc },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 md:pb-12">
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm">
        <div className="grid lg:grid-cols-2">
          <div className="flex flex-col items-start justify-center p-7 sm:p-10 lg:p-12">
            <p className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
              {t.home.heroKicker}
            </p>
            <h1 className="mt-5 max-w-xl font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-[1.35] tracking-tight text-slate-950">
              {t.home.heroTitle}
            </h1>
            <p className="mt-4 max-w-xl text-sm sm:text-base leading-7 text-slate-600">
              {t.home.heroSubtitle}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('library')}
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <span>{t.home.ctaPrimary}</span>
              <AppIcon name={isRTL ? 'arrowLeft' : 'arrowRight'} size="sm" />
            </button>
          </div>

          <div className="flex items-center border-t border-slate-100 bg-slate-50/80 p-5 sm:p-8 lg:border-t-0 lg:border-s lg:p-10">
            {featuredBook ? (
              <button
                type="button"
                onClick={() => onOpenBook(featuredBook.id)}
                className="group w-full rounded-2xl border border-slate-200 bg-white p-5 text-start shadow-sm transition hover:border-indigo-200 hover:shadow-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-indigo-700">{t.library.continueReading}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    {featuredBook.subject || (isRTL ? 'كتاب مدرسي' : 'Textbook')}
                  </span>
                </div>
                <h2 className="mt-5 font-display text-xl font-bold leading-snug text-slate-900 transition-colors group-hover:text-indigo-700 sm:text-2xl">
                  {featuredBook.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                  {featuredBook.summary}
                </p>
                <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
                  <span>{t.common.pageOf.replace('{current}', String(featuredBook.currentPage || 1)).replace('{total}', String(featuredBook.totalPages))}</span>
                  <span>{bookProgress}%</span>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label={t.nav.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={bookProgress}
                >
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-[width]"
                    style={{ width: `${bookProgress}%` }}
                  />
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-slate-800">
                  <span>{t.library.openBook}</span>
                  <AppIcon name={isRTL ? 'arrowLeft' : 'arrowRight'} size="sm" className="text-indigo-600" />
                </div>
              </button>
            ) : localBooksEnabled ? (
              <button
                type="button"
                onClick={() => onNavigate('add-book')}
                className="w-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-start transition hover:border-indigo-300 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <h2 className="font-display text-lg font-bold text-slate-900">{t.addBook.uploadTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{t.addBook.uploadSubtitle}</p>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('library')}
                className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-start transition hover:border-indigo-300 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <h2 className="font-display text-lg font-bold text-slate-900">{t.library.pageTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{t.library.pageSubtitle}</p>
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="mt-9 sm:mt-12" aria-labelledby="home-features-heading">
        <div className="mb-4 sm:mb-5">
          <h2 id="home-features-heading" className="font-display text-lg font-bold text-slate-900 sm:text-xl">
            {t.home.featureHighlightTitle}
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
              <h3 className="font-display text-sm font-bold leading-6 text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-xs leading-6 text-slate-600 sm:text-sm">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

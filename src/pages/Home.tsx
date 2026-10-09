import React from 'react';
import { useI18n } from '../i18n';
import { ActivePage, Book } from '../types';
import { AppIcon, TYPOGRAPHY, MOTION } from '../design-system';

interface HomeProps {
  onNavigate: (page: ActivePage) => void;
  onOpenBook: (bookId: string) => void;
  featuredBook?: Book | null;
}

export const Home: React.FC<HomeProps> = ({
  onNavigate,
  onOpenBook,
  featuredBook,
}) => {
  const { t, isRTL } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 py-10 max-w-5xl mx-auto">
      {/* Brand Hero Kicker */}
      <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50/80 px-3.5 py-1.5 rounded-full mb-6">
        <AppIcon name="sparkles" size="xs" className="text-indigo-600" />
        <span>{t.home.heroKicker}</span>
      </div>

      {/* Main Slogan & Headline */}
      <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight text-center leading-tight mb-5 max-w-3xl font-display" style={{ textWrap: 'balance' }}>
        {t.home.heroTitle}
      </h1>

      {/* Simplified Clear Subtitle */}
      <p className="text-base sm:text-lg text-slate-600 text-center leading-relaxed max-w-2xl mb-8 font-sans">
        {t.home.heroSubtitle}
      </p>

      {/* Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto mb-14">
        <button
          type="button"
          onClick={() => onNavigate('library')}
          className="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm sm:text-base hover:bg-slate-800 transition-all shadow-md active:scale-[0.98] motion-reduce:transform-none flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <span>{t.home.ctaPrimary}</span>
          <AppIcon name={isRTL ? 'arrowLeft' : 'arrowRight'} size="sm" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('add-book')}
          className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-white border border-slate-300 text-slate-800 font-semibold text-sm sm:text-base hover:bg-slate-50 transition-all active:scale-[0.98] motion-reduce:transform-none flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <AppIcon name="addBook" size="sm" className="text-slate-600" />
          <span>{t.home.ctaSecondary}</span>
        </button>
      </div>

      {/* Authentic Book Showcase Card (Proves book layout is preserved as is) */}
      <div className="w-full bg-slate-50 border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-start max-w-md">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2">
              <AppIcon name="view" size="sm" className="text-indigo-600" />
              <span>{t.home.featureHighlightTitle}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3 leading-snug font-display">
              {t.home.feature1Title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4 font-sans">
              {t.home.feature1Desc}
            </p>

            <div className="space-y-2 text-xs text-slate-700 font-sans">
              <div className="flex items-center gap-2">
                <AppIcon name="check" size="sm" className="text-emerald-600" />
                <span>{t.home.feature2Title}: {t.home.feature2Desc}</span>
              </div>
              <div className="flex items-center gap-2">
                <AppIcon name="check" size="sm" className="text-emerald-600" />
                <span>{t.home.feature3Title}: {t.home.feature3Desc}</span>
              </div>
            </div>
          </div>

          {/* Interactive Mini Book Preview Box */}
          {featuredBook ? (
            <div
              onClick={() => onOpenBook(featuredBook.id)}
              role="button"
              tabIndex={0}
              className="w-full md:w-80 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group text-start active:scale-[0.99] motion-reduce:transform-none"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-sans">
                <span className="font-medium text-slate-700">{featuredBook.subject || (isRTL ? 'منهاج دراسي' : 'Curriculum')}</span>
                <span>{t.common.page} {featuredBook.currentPage || 1}</span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors mb-2 font-display">
                {featuredBook.title}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed font-sans">
                {featuredBook.summary}
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-semibold text-indigo-600">
                <span>{t.library.openBook}</span>
                <AppIcon name={isRTL ? 'arrowLeft' : 'arrowRight'} size="xs" />
              </div>
            </div>
          ) : (
            <div
              onClick={() => onNavigate('add-book')}
              role="button"
              tabIndex={0}
              className="w-full md:w-80 bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer group active:scale-[0.99] motion-reduce:transform-none"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <AppIcon name="addBook" size="md" />
              </div>
              <h3 className="font-bold text-slate-800 text-xs mb-1 font-display">
                {t.addBook.uploadTitle}
              </h3>
              <p className="text-[11px] text-slate-500 font-sans">
                {t.addBook.uploadSubtitle}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

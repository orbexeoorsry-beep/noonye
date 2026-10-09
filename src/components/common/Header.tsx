import React, { useState } from 'react';
import { Logo } from './Logo';
import { useI18n } from '../../i18n';
import { ActivePage } from '../../types';
import { SettingsModal } from './SettingsModal';
import { AppIcon, IconButton } from '../../design-system';

interface HeaderProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
}

export const Header: React.FC<HeaderProps> = ({ activePage, onNavigate }) => {
  const { t, lang, setLanguage, isRTL } = useI18n();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const toggleLanguage = () => {
    setLanguage(lang === 'ar' ? 'en' : 'ar');
  };

  const destinations: { id: ActivePage; label: string }[] = [
    { id: 'home', label: t.nav.home },
    { id: 'library', label: t.nav.library },
    { id: 'progress', label: t.nav.progress },
  ];

  const showAddBookAction = activePage === 'home' || activePage === 'progress';

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex min-h-11 shrink-0 items-center rounded-xl p-1 text-start focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label={t.appNameFull}
          >
            <Logo size="md" />
          </button>

          <nav
            className="hidden items-center gap-1 rounded-xl bg-slate-50 p-1 md:flex"
            aria-label={isRTL ? 'التنقل الرئيسي' : 'Main navigation'}
          >
            {destinations.map((destination) => {
              const isActive = activePage === destination.id;
              return (
                <button
                  key={destination.id}
                  type="button"
                  onClick={() => onNavigate(destination.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-h-10 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {destination.label}
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={isRTL ? 'تبديل اللغة / Switch language' : 'Switch language / تبديل اللغة'}
              className="min-h-10 rounded-lg px-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 sm:px-3"
            >
              {lang === 'ar' ? 'English' : 'عربي'}
            </button>

            <IconButton
              name="settings"
              iconSize="sm"
              variant="ghost"
              label={t.common.settings}
              onClick={() => setIsSettingsOpen(true)}
            />

            {showAddBookAction && (
              <button
                type="button"
                onClick={() => onNavigate('add-book')}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:px-4 sm:text-sm"
              >
                <AppIcon name="addBook" size="xs" />
                <span>{t.actions.addBook}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

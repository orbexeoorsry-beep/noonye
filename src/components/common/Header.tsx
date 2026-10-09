import React, { useState } from 'react';
import { Logo } from './Logo';
import { useI18n } from '../../i18n';
import { ActivePage } from '../../types';
import { SettingsModal } from './SettingsModal';
import { AppIcon, IconButton, NavigationIcon } from '../../design-system';

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

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-start focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-xl p-1 min-h-[44px]"
            aria-label={t.appNameFull}
          >
            <Logo size="md" />
          </button>

          {/* Zone 2: Clean Navigation Links (Single-line, unboxed) */}
          <nav className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600">
            <NavigationIcon
              name="home"
              label={t.nav.home}
              isActive={activePage === 'home'}
              variant="headerNav"
              onClick={() => onNavigate('home')}
            />
            <NavigationIcon
              name="library"
              label={t.nav.library}
              isActive={activePage === 'library'}
              variant="headerNav"
              onClick={() => onNavigate('library')}
            />
            <NavigationIcon
              name="addBook"
              label={t.nav.addBook}
              isActive={activePage === 'add-book'}
              variant="headerNav"
              onClick={() => onNavigate('add-book')}
            />
            <NavigationIcon
              name="progress"
              label={t.nav.progress}
              isActive={activePage === 'progress'}
              variant="headerNav"
              onClick={() => onNavigate('progress')}
            />
          </nav>

          {/* Zone 3: 1-2 Primary Actions + Language Switcher + Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <IconButton
              name="language"
              iconSize="sm"
              variant="ghost"
              label={isRTL ? 'تبديل اللغة / Switch Language' : 'Switch Language / تبديل اللغة'}
              onClick={toggleLanguage}
            >
              <span className="font-sans text-xs">{lang === 'ar' ? 'English' : 'عربي'}</span>
            </IconButton>

            <IconButton
              name="settings"
              iconSize="sm"
              variant="ghost"
              label={t.common.settings}
              onClick={() => setIsSettingsOpen(true)}
            />

            <button
              type="button"
              onClick={() => onNavigate('add-book')}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs active:scale-[0.98] motion-reduce:transform-none flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <AppIcon name="addBook" size="sm" />
              <span>{t.actions.addBook}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal containing Language Switcher */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};



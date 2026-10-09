import React from 'react';
import { useI18n } from '../../i18n';
import { ActivePage } from '../../types';
import { NavigationIcon, IconName } from '../../design-system';

interface BottomNavProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activePage, onNavigate }) => {
  const { t, isRTL } = useI18n();

  const tabs: { id: ActivePage; label: string; iconName: IconName }[] = [
    { id: 'home', label: t.nav.home, iconName: 'home' },
    { id: 'library', label: t.nav.library, iconName: 'library' },
    { id: 'progress', label: t.nav.progress, iconName: 'progress' },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-xl md:hidden"
      aria-label={isRTL ? 'التنقل الرئيسي' : 'Main navigation'}
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-3 items-center px-3">
        {tabs.map((tab) => (
          <NavigationIcon
            key={tab.id}
            name={tab.iconName}
            label={tab.label}
            isActive={activePage === tab.id}
            variant="bottomNav"
            onClick={() => onNavigate(tab.id)}
          />
        ))}
      </div>
    </nav>
  );
};

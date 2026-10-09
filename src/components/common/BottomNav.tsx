import React from 'react';
import { useI18n } from '../../i18n';
import { ActivePage } from '../../types';
import { NavigationIcon, IconName } from '../../design-system';

interface BottomNavProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activePage, onNavigate }) => {
  const { t } = useI18n();

  const tabs: { id: ActivePage; label: string; iconName: IconName }[] = [
    { id: 'home', label: t.nav.home, iconName: 'home' },
    { id: 'library', label: t.nav.library, iconName: 'library' },
    { id: 'add-book', label: t.nav.addBook, iconName: 'addBook' },
    { id: 'progress', label: t.nav.progress, iconName: 'progress' },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="grid grid-cols-4 items-center h-16 max-w-md mx-auto px-2">
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

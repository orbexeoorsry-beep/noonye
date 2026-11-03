import React from 'react';
import { useI18n } from '../../i18n';
import { HardDrive } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useI18n();

  return (
    <footer className="mt-auto w-full px-4 py-6 pb-24 sm:px-6 md:pb-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs text-slate-500 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">{t.appNameFull}</span>
          <span aria-hidden="true">·</span>
          <span>{t.appSlogan}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <HardDrive className="h-3.5 w-3.5 text-indigo-600" aria-hidden="true" />
          <span>{t.common.localPrivacyNotice}</span>
          <span aria-hidden="true">·</span>
          <span>{t.common.safeForStudents}</span>
        </div>
      </div>
    </footer>
  );
};

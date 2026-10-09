import React from 'react';
import { useI18n } from '../../i18n';
import { ShieldCheck, HardDrive } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useI18n();

  return (
    <footer className="w-full border-t border-slate-200 bg-white py-8 px-4 sm:px-6 lg:px-8 mt-auto pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">{t.appNameFull}</span>
          <span aria-hidden="true">·</span>
          <span>{t.appSlogan}</span>
        </div>

        <div className="flex items-center gap-4 text-slate-500">
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
            <HardDrive className="w-3.5 h-3.5" />
            <span>{t.common.localPrivacyNotice}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t.common.safeForStudents}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

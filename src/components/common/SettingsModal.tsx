import React from 'react';
import { useI18n, supportedLanguages } from '../../i18n';
import { AppIcon, IconButton } from '../../design-system';
import { isFeatureEnabled } from '../../config/feature-flags';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t, lang, setLanguage, isRTL } = useI18n();

  const handleSelectLanguage = (newLang: string) => {
    if (newLang === 'en' && !isFeatureEnabled('englishLanguageEnabled')) return;
    setLanguage(newLang);
  };

  if (!isOpen) return null;

  const availableLanguages = Object.values(supportedLanguages).filter(
    (item) => item.code !== 'en' || isFeatureEnabled('englishLanguageEnabled')
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 motion-reduce:animate-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200 motion-reduce:transition-none"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none"
      >
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base font-display">
            {t.settings?.title || (isRTL ? 'الإعدادات' : 'Settings')}
          </h3>
          <IconButton
            name="close"
            iconSize="sm"
            variant="ghost"
            onClick={onClose}
            label={t.common?.close || 'إغلاق'}
            className="min-h-[40px] min-w-[40px]"
          />
        </div>

        <div className="p-5 space-y-5 font-sans">
          {/* Language Selection Section */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-slate-800">
              <AppIcon name="language" size="sm" className="text-indigo-600" />
              <h4 className="text-sm font-bold font-display">
                {t.settings?.language || (isRTL ? 'لغة التطبيق' : 'Application Language')}
              </h4>
            </div>

            <p className="text-xs text-slate-500 mb-3.5 leading-relaxed font-sans">
              {t.settings?.languageDesc ||
                (isRTL
                  ? 'اختر لغة الواجهة المفضلة لمنصة نون التعليمية'
                  : 'Choose your preferred interface language')}
            </p>

            <div className="space-y-2">
              {availableLanguages.map((item) => {
                const isSelected = lang === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSelectLanguage(item.code)}
                    className={`w-full min-h-[44px] flex items-center justify-between p-3 rounded-2xl border text-sm font-medium transition-all select-none active:scale-[0.98] motion-reduce:transform-none ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex flex-col text-start font-sans">
                      <span className="font-semibold text-xs sm:text-sm">{item.nativeName}</span>
                      <span className="text-[11px] text-slate-500">
                        {item.dir === 'rtl'
                          ? isRTL
                            ? 'الاتجاه من اليمين لليسار (RTL)'
                            : 'Right-to-Left (RTL)'
                          : isRTL
                          ? 'الاتجاه من اليسار لليمين (LTR)'
                          : 'Left-to-Right (LTR)'}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <AppIcon name="check" size="xs" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer info & close */}
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors active:scale-[0.98] motion-reduce:transform-none"
            >
              {t.common?.close || (isRTL ? 'إغلاق' : 'Close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

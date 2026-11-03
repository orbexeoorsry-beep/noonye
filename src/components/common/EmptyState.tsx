import React from 'react';
import { AppIcon, IconName } from '../../design-system';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: IconName | React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  actionLabel,
  onAction,
  icon,
}) => {
  const effectiveActionText = actionLabel || actionText;

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-slate-50/70 border border-dashed border-slate-300 rounded-3xl max-w-lg mx-auto my-8">
      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-4 shadow-2xs">
        {typeof icon === 'string' ? (
          <AppIcon name={icon as IconName} size="xl" className="text-slate-400" />
        ) : icon ? (
          icon
        ) : (
          <AppIcon name="library" size="xl" className="text-slate-400" />
        )}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5 font-display">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 mb-6 max-w-sm leading-relaxed font-sans">{description}</p>
      {effectiveActionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {effectiveActionText}
        </button>
      )}
    </div>
  );
};

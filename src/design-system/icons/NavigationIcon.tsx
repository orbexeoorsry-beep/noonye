import React from 'react';
import { AppIcon, AppIconSize } from './AppIcon';
import { IconName } from './icon-registry';
import { LucideIcon } from 'lucide-react';

export interface NavigationIconProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  name?: IconName;
  icon?: LucideIcon;
  iconSize?: AppIconSize;
  label: string;
  isActive?: boolean;
  variant?: 'bottomNav' | 'headerNav' | 'sidebarNav';
  badgeCount?: number;
  className?: string;
}

/**
 * NavigationIcon: Unified navigation component for header and mobile bottom bars.
 * Ensures minimum touch target (44px+), active state indicator, and accessible labeling.
 */
export const NavigationIcon: React.FC<NavigationIconProps> = ({
  name,
  icon,
  iconSize,
  label,
  isActive = false,
  variant = 'bottomNav',
  badgeCount,
  className = '',
  disabled,
  ...rest
}) => {
  if (variant === 'bottomNav') {
    return (
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
        disabled={disabled}
        className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1.5 px-2 transition-all duration-150 relative select-none active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl ${
          isActive
            ? 'text-indigo-600 font-semibold'
            : 'text-slate-500 hover:text-slate-900'
        } ${className}`}
        {...rest}
      >
        <div className="relative">
          <AppIcon
            name={name}
            icon={icon}
            size={iconSize || 'lg'}
            className={`transition-transform duration-150 motion-reduce:transform-none ${
              isActive ? 'scale-110' : ''
            }`}
          />
          {typeof badgeCount === 'number' && badgeCount > 0 && (
            <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center">
              {badgeCount}
            </span>
          )}
        </div>
        <span className="text-[11px] mt-1 leading-none tracking-tight whitespace-nowrap">
          {label}
        </span>
        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 absolute bottom-1" />
        )}
      </button>
    );
  }

  // Header Nav Link
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      disabled={disabled}
      className={`min-h-[44px] px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap select-none active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        isActive
          ? 'text-indigo-600 font-semibold bg-indigo-50/70 border border-indigo-100 shadow-2xs'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
      } ${className}`}
      {...rest}
    >
      <AppIcon
        name={name}
        icon={icon}
        size={iconSize || 'sm'}
        className={isActive ? 'text-indigo-600' : 'text-slate-500'}
      />
      <span>{label}</span>
    </button>
  );
};

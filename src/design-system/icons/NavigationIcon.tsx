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

/** Unified accessible navigation button used by the mobile destination bar. */
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
        className={`relative flex min-h-[48px] min-w-[56px] flex-col items-center justify-center rounded-xl px-2 py-1.5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          isActive
            ? 'bg-indigo-50/80 text-indigo-700 font-semibold'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        } ${className}`}
        {...rest}
      >
        <span className="relative">
          <AppIcon name={name} icon={icon} size={iconSize || 'md'} />
          {typeof badgeCount === 'number' && badgeCount > 0 && (
            <span className="absolute -right-2 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
              {badgeCount}
            </span>
          )}
        </span>
        <span className="mt-1 whitespace-nowrap text-[11px] leading-none">{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      disabled={disabled}
      className={`flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        isActive
          ? 'border-indigo-100 bg-indigo-50/70 text-indigo-600 shadow-2xs'
          : 'border-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
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

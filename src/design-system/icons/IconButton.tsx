import React from 'react';
import { AppIcon, AppIconProps, AppIconSize } from './AppIcon';
import { IconName } from './icon-registry';
import { LucideIcon } from 'lucide-react';

export type IconButtonVariant =
  | 'ghost'
  | 'outline'
  | 'solid'
  | 'primary'
  | 'danger'
  | 'subtle'
  | 'amber';

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  name?: IconName;
  icon?: LucideIcon;
  iconSize?: AppIconSize;
  variant?: IconButtonVariant;
  active?: boolean;
  label: string; // Required for accessibility (used in aria-label and tooltip title)
  tooltip?: string;
  badgeCount?: number;
  badgeColor?: string;
  className?: string;
  iconClassName?: string;
}

const VARIANT_STYLES: Record<IconButtonVariant, string> = {
  ghost:
    'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent',
  outline:
    'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs',
  solid:
    'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 shadow-xs',
  primary:
    'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-xs ring-1 ring-indigo-500/30',
  danger:
    'bg-red-50 text-red-600 border-red-100 hover:bg-red-100 hover:text-red-700',
  subtle:
    'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900',
  amber:
    'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/90',
};

/**
 * IconButton: Unified accessible icon button for Noon.
 * Guarantees a minimum 44px touch target on mobile devices, rounded modern design,
 * accessible tooltip / aria-label, and subtle interaction motion.
 */
export const IconButton: React.FC<IconButtonProps> = ({
  name,
  icon,
  iconSize = 'md',
  variant = 'ghost',
  active,
  label,
  tooltip,
  badgeCount,
  badgeColor = 'bg-amber-500 text-slate-900',
  className = '',
  iconClassName = '',
  disabled,
  children,
  ...rest
}) => {
  const effectiveTooltip = tooltip || label;

  return (
    <button
      type="button"
      title={effectiveTooltip}
      aria-label={label}
      aria-pressed={typeof active === 'boolean' ? active : undefined}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 select-none active:scale-[0.98] motion-reduce:transform-none disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${VARIANT_STYLES[variant]} ${className}`}
      {...rest}
    >
      {(name || icon) && (
        <AppIcon
          name={name}
          icon={icon}
          size={iconSize}
          className={iconClassName}
          aria-hidden={true}
        />
      )}

      {children && <span className="inline-flex items-center gap-1.5">{children}</span>}

      {typeof badgeCount === 'number' && badgeCount > 0 && (
        <span
          className={`absolute -top-1 -right-1 w-4 h-4 rounded-full font-bold text-[10px] flex items-center justify-center shadow-xs ${badgeColor}`}
          aria-label={`${badgeCount} items`}
        >
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </button>
  );
};

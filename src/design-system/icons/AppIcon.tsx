import React from 'react';
import {
  ICON_REGISTRY,
  IconName,
  StandardIconProps,
  DEFAULT_ICON_CONFIG,
} from './icon-registry';
import { LucideIcon } from 'lucide-react';

export type AppIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;

const SIZE_MAP: Record<string, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
};

export interface AppIconProps extends StandardIconProps {
  name?: IconName;
  icon?: LucideIcon;
  size?: AppIconSize;
  className?: string;
}

/**
 * AppIcon: Unified icon component for the Noon project.
 * Enforces uniform stroke thickness, rounded styling, and simple consistency.
 *
 * Usage:
 *  <AppIcon name="library" size="md" className="text-indigo-600" />
 *  <AppIcon icon={BookOpen} size="lg" />
 */
export const AppIcon: React.FC<AppIconProps> = ({
  name,
  icon,
  size = 'md',
  className = '',
  strokeWidth = DEFAULT_ICON_CONFIG.strokeWidth,
  'aria-hidden': ariaHidden = true,
  'aria-label': ariaLabel,
  ...rest
}) => {
  // Resolve component from registry name or direct icon prop
  const ResolvedIcon = icon || (name ? ICON_REGISTRY[name] : null);

  if (!ResolvedIcon) {
    console.warn(`AppIcon: No icon found for name "${name}"`);
    return null;
  }

  const numericSize = typeof size === 'number' ? size : SIZE_MAP[size] || 16;

  return (
    <ResolvedIcon
      size={numericSize}
      strokeWidth={strokeWidth}
      strokeLinecap={DEFAULT_ICON_CONFIG.strokeLinecap}
      strokeLinejoin={DEFAULT_ICON_CONFIG.strokeLinejoin}
      className={`shrink-0 inline-block align-middle transition-colors ${className}`}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      {...rest}
    />
  );
};

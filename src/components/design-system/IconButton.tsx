import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'primary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon: React.ReactNode;
  label?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'default',
  size = 'md',
  label,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'flex items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer';

  const sizeClasses = {
    sm: 'min-h-[36px] min-w-[36px] p-1.5 text-xs',
    md: 'min-h-[44px] min-w-[44px] p-2 text-sm',
    lg: 'min-h-[50px] min-w-[50px] p-3 text-base',
  }[size];

  const variantClasses = {
    default: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 bg-white',
    ghost: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
    primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs',
    danger: 'text-red-600 hover:bg-red-50 hover:text-red-700',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      aria-label={label}
      title={label}
      {...props}
    >
      {icon}
    </button>
  );
};

export default IconButton;

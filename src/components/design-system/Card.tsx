import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'bordered' | 'indigo' | 'amber' | 'emerald';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const baseClasses = 'rounded-2xl transition-all';

  const variantClasses = {
    default: 'bg-white border border-slate-200/90 shadow-2xs',
    flat: 'bg-slate-50 border border-slate-200/70',
    bordered: 'bg-transparent border border-slate-300',
    indigo: 'bg-indigo-50/70 border border-indigo-200/90 shadow-2xs text-indigo-950',
    amber: 'bg-amber-50/70 border border-amber-200/90 shadow-2xs text-amber-950',
    emerald: 'bg-emerald-50/90 border border-emerald-200 shadow-2xs text-emerald-950',
  }[variant];

  return (
    <div className={`${baseClasses} ${variantClasses} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;

import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7 text-sm', text: 'text-base font-bold' },
    md: { box: 'w-9 h-9 text-lg', text: 'text-lg font-bold' },
    lg: { box: 'w-12 h-12 text-2xl', text: 'text-2xl font-bold' },
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Authentic Geometric Arabic Noon Mark */}
      <div
        className={`${sizeMap[size].box} rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm transition-transform active:scale-95 relative overflow-hidden`}
        aria-hidden="true"
      >
        <span className="font-serif leading-none mt-0.5 tracking-wide">ن</span>
        <div className="absolute top-1.5 left-1.5 w-1 h-1 rounded-full bg-indigo-400 opacity-80" />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`${sizeMap[size].text} tracking-tight text-slate-900 font-display leading-tight`}>
            نــون
          </span>
        </div>
      )}
    </div>
  );
};

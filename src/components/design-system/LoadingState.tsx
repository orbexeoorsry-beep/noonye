import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'جارٍ المعالجة...',
  description,
  className = '',
}) => {
  return (
    <div
      className={`p-8 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center gap-3 animate-in fade-in duration-150 ${className}`}
    >
      <Loader2 className="w-6 h-6 animate-spin text-indigo-600 motion-reduce:animate-none" />
      <p className="text-xs font-semibold text-slate-700">{title}</p>
      {description && <p className="text-[11px] text-slate-400">{description}</p>}
    </div>
  );
};

export default LoadingState;

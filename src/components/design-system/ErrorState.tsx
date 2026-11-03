import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onClose?: () => void;
  canRetry?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'تنبيه',
  message,
  onRetry,
  onClose,
  canRetry = true,
  className = '',
}) => {
  return (
    <div
      className={`p-5 rounded-2xl border border-red-200 bg-red-50 text-right space-y-3 animate-in fade-in duration-150 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h5 className="font-bold text-red-900 text-xs sm:text-sm">{title}</h5>
          <p className="text-xs text-red-700 leading-relaxed mt-1">{message}</p>
        </div>
      </div>
      {(onRetry || onClose) && (
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {canRetry && onRetry && (
            <Button
              variant="danger"
              size="sm"
              onClick={onRetry}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              إعادة المحاولة
            </Button>
          )}
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              إغلاق
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorState;

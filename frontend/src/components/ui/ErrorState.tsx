import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`rounded-3xl border border-[#F1CECC] dark:border-[#522727] bg-[#FBF0EF]/80 dark:bg-[#2F1717]/60 p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-3 max-w-md mx-auto shadow-sm ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#A33A38]/15 dark:bg-[#F87171]/20 text-[#A33A38] dark:text-[#F87171] flex items-center justify-center shrink-0">
        <AlertCircle className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h4 className="text-base font-bold text-[#A33A38] dark:text-[#F87171]">
          {title}
        </h4>
        <p className="text-xs text-[#6E2A28] dark:text-[#FCA5A5] leading-relaxed">
          {message}
        </p>
      </div>

      {onRetry && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={onRetry}
            className="border-[#D49896] dark:border-[#733535] text-[#A33A38] dark:text-[#F87171] hover:bg-[#F3DCDA] dark:hover:bg-[#401E1E]"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};

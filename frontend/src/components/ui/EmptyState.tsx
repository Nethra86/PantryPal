import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  illustration?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  illustration,
  action,
  secondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`rounded-3xl border border-[#E8E1D3] dark:border-[#23332A] bg-white/70 dark:bg-[#18221C]/70 p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto shadow-sm ${className}`}
    >
      {illustration && <div className="mb-1">{illustration}</div>}

      <div className="space-y-1.5">
        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#1D2420] dark:text-[#F2F5F3]">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-[#56645A] dark:text-[#A3B5AA] max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {action && (
            <Button
              variant="primary"
              size="md"
              leftIcon={action.icon}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              size="md"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-[#1D2420] dark:text-[#E2EBE5]">
            {label}
          </label>
        )}

        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={`w-full rounded-xl border bg-white dark:bg-[#131C16] text-sm text-[#1D2420] dark:text-[#F2F5F3] placeholder-[#87968B] dark:placeholder-[#56685B] p-3 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#1C3B2B]/20 dark:focus:ring-emerald-500/30 ${
            error
              ? 'border-[#A33A38] focus:border-[#A33A38]'
              : 'border-[#E2DBD0] dark:border-[#25362C] hover:border-[#C9C0B3] dark:hover:border-[#384F41] focus:border-[#1C3B2B] dark:focus:border-emerald-500'
          } ${className}`}
          {...props}
        />

        {error ? (
          <p className="text-[11px] font-medium text-[#A33A38] dark:text-[#F87171]">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-[#56645A] dark:text-[#87968B]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

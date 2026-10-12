import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, children, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-[#1D2420] dark:text-[#E2EBE5]">
            {label}
          </label>
        )}

        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={`w-full appearance-none rounded-xl border bg-white dark:bg-[#131C16] text-sm text-[#1D2420] dark:text-[#F2F5F3] pl-3.5 pr-9 py-2.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#1C3B2B]/20 dark:focus:ring-emerald-500/30 ${
              error
                ? 'border-[#A33A38] focus:border-[#A33A38]'
                : 'border-[#E2DBD0] dark:border-[#25362C] hover:border-[#C9C0B3] dark:hover:border-[#384F41] focus:border-[#1C3B2B] dark:focus:border-emerald-500'
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#87968B] pointer-events-none" />
        </div>

        {error ? (
          <p className="text-[11px] font-medium text-[#A33A38] dark:text-[#F87171]">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-[#56645A] dark:text-[#87968B]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';

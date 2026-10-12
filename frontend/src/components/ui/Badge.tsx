import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'forest' | 'sage' | 'amber' | 'rose' | 'neutral' | 'ready';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  children,
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-semibold',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
  };

  const variantStyles = {
    forest:
      'bg-[#1C3B2B] text-white border border-[#162E21] dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
    sage:
      'bg-[#EBF2EC] text-[#1C3B2B] border border-[#C8D9CB] dark:bg-[#182B1E] dark:text-[#8DB896] dark:border-[#2B4734]',
    amber:
      'bg-[#FDF6EC] text-[#B46A1B] border border-[#F3DCBD] dark:bg-[#2A1D0B] dark:text-[#F59E0B] dark:border-[#4D3315]',
    rose:
      'bg-[#FBF0EF] text-[#A33A38] border border-[#F1CECC] dark:bg-[#2F1717] dark:text-[#F87171] dark:border-[#522727]',
    neutral:
      'bg-[#F3EEE4] text-[#56645A] border border-[#E2DBD0] dark:bg-[#1A251E] dark:text-[#A3B5AA] dark:border-[#25362C]',
    ready:
      'bg-[#E9F4EC] text-[#1C3B2B] border border-[#99C5A2] dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 shadow-sm',
  };

  const dotColors = {
    forest: 'bg-white dark:bg-emerald-400',
    sage: 'bg-[#56735D] dark:bg-[#8DB896]',
    amber: 'bg-[#B46A1B] dark:bg-[#F59E0B]',
    rose: 'bg-[#A33A38] dark:bg-[#F87171]',
    neutral: 'bg-[#87968B] dark:bg-[#A3B5AA]',
    ready: 'bg-[#1C3B2B] dark:bg-emerald-400',
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg tracking-wide uppercase select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse-gently ${dotColors[variant]}`}
        />
      )}
      {children}
    </span>
  );
};

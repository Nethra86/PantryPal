import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'amber' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  // Base classes
  const base =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30';

  // Size variations
  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-5 py-3 gap-2.5 font-semibold',
  };

  // Calm, premium kitchen companion variants
  const variantStyles = {
    primary:
      'bg-[#1C3B2B] text-white hover:bg-[#264E3A] shadow-sm hover:shadow dark:bg-emerald-500 dark:text-[#062415] dark:hover:bg-emerald-400 font-semibold',
    secondary:
      'bg-[#EBF2EC] text-[#1C3B2B] hover:bg-[#DEE8E0] dark:bg-[#182B1E] dark:text-[#8DB896] dark:hover:bg-[#203728]',
    outline:
      'border border-[#DCD5C9] bg-transparent text-[#1D2420] hover:bg-[#F3EFE7] dark:border-[#2B3B30] dark:text-[#F2F5F3] dark:hover:bg-[#18231C]',
    ghost:
      'bg-transparent text-[#56645A] hover:text-[#1D2420] hover:bg-[#F2ECE2] dark:text-[#A3B5AA] dark:hover:text-white dark:hover:bg-[#17211B]',
    amber:
      'bg-[#B46A1B] text-white hover:bg-[#9E5B14] shadow-sm dark:bg-[#F59E0B] dark:text-[#1F1404]',
    destructive:
      'bg-[#A33A38] text-white hover:bg-[#8B302F] shadow-sm dark:bg-[#EF4444] dark:text-white',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${base} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};

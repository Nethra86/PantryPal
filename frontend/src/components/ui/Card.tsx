import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ hoverable = false, className = '', children, ...props }) => {
  return (
    <div
      className={`rounded-2xl border border-[#E8E1D3] dark:border-[#23332A] bg-white dark:bg-[#18221C] text-[#1D2420] dark:text-[#F2F5F3] shadow-[0_4px_16px_-4px_rgba(35,45,38,0.06)] dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.45)] transition-all duration-200 overflow-hidden ${
        hoverable ? 'hover:shadow-[0_8px_24px_-4px_rgba(35,45,38,0.1)] hover:-translate-y-0.5' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => {
  return (
    <div className={`p-5 sm:p-6 pb-3 border-b border-[#F2EDE4] dark:border-[#1F2C24] ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className = '', children, ...props }) => {
  return (
    <h3 className={`text-lg font-bold tracking-tight text-[#1D2420] dark:text-[#F2F5F3] ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className = '', children, ...props }) => {
  return (
    <p className={`text-xs text-[#56645A] dark:text-[#A3B5AA] mt-1 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => {
  return (
    <div className={`p-5 sm:p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => {
  return (
    <div className={`p-4 sm:p-5 pt-3 border-t border-[#F2EDE4] dark:border-[#1F2C24] bg-[#FAF7F2]/50 dark:bg-[#131B16]/50 flex items-center justify-between gap-3 ${className}`} {...props}>
      {children}
    </div>
  );
};

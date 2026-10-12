import React from 'react';

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse bg-[#EDE6DC] dark:bg-[#202E24] rounded-xl ${className}`}
      {...props}
    />
  );
};

export const RecipeCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-[#E8E1D3] dark:border-[#23332A] bg-white dark:bg-[#18221C] overflow-hidden p-0 flex flex-col justify-between">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="p-4 space-y-2.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <div className="p-4 pt-1 flex gap-2 border-t border-[#F2EDE4] dark:border-[#1F2C24]">
        <Skeleton className="h-8 flex-1 rounded-xl" />
      </div>
    </div>
  );
};

export const PantryItemSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-[#E8E1D3] dark:border-[#23332A] bg-white dark:bg-[#18221C] p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-6 w-6 rounded-lg" />
      </div>
      <Skeleton className="h-5 w-24 rounded-md" />
      <div className="pt-2 flex justify-between items-center border-t border-[#F2EDE4] dark:border-[#1F2C24]">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-6 w-20 rounded-lg" />
      </div>
    </div>
  );
};

export const StatCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-[#E8E1D3] dark:border-[#23332A] bg-white dark:bg-[#18221C] p-5 space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-2.5 w-32" />
    </div>
  );
};

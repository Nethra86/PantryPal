import React from 'react';
import { Search, Plus, Sun, Moon, Bell, Leaf } from 'lucide-react';
import { Button } from '../ui/Button';

export interface HeaderProps {
  onOpenAddPantry: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  expiringCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddPantry,
  isDark,
  onToggleTheme,
  searchQuery,
  onSearchChange,
  expiringCount,
}) => {
  return (
    <header className="sticky top-0 z-20 w-full bg-[#FAF7F2]/90 dark:bg-[#0E1410]/90 backdrop-blur-md border-b border-[#E8E1D3] dark:border-[#23332A] px-4 sm:px-6 lg:px-8 py-3 transition-colors">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Mobile Brand Mark */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="w-8 h-8 rounded-xl bg-[#1C3B2B] dark:bg-emerald-500/20 text-[#FAF7F2] dark:text-emerald-300 flex items-center justify-center">
            <Leaf className="w-4 h-4 fill-current" />
          </div>
          <span className="text-base font-bold tracking-tight text-[#1D2420] dark:text-[#F2F5F3]">
            PantryPal
          </span>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md relative hidden sm:block">
          <Search className="w-4 h-4 text-[#87968B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search ingredients, recipes, or storage..."
            className="w-full rounded-2xl border border-[#E2DBD0] dark:border-[#25362C] bg-white dark:bg-[#16201A] pl-10 pr-12 py-2 text-xs text-[#1D2420] dark:text-[#F2F5F3] placeholder-[#87968B] focus:outline-none focus:border-[#1C3B2B] dark:focus:border-emerald-500 focus:ring-1 focus:ring-[#1C3B2B]/20 transition-all"
          />
          <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EDE6DC] dark:bg-[#202E24] text-[#56645A] dark:text-[#A3B5AA] border border-[#DDD5C8] dark:border-[#28392F]">
            Ctrl K
          </kbd>
        </div>

        {/* Header Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Theme Switcher Button */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-[#56645A] dark:text-[#A3B5AA] hover:bg-[#F2ECE2] dark:hover:bg-[#1D2A22] transition-colors border border-transparent hover:border-[#E2DBD0] dark:hover:border-[#25362C]"
            title={isDark ? 'Switch to Warm Ivory' : 'Switch to Midnight Forest'}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-[#F59E0B]" />
            ) : (
              <Moon className="w-4 h-4 text-[#56735D]" />
            )}
          </button>

          {/* Quick Notification Bell */}
          <div className="relative">
            <button
              className="p-2 rounded-xl text-[#56645A] dark:text-[#A3B5AA] hover:bg-[#F2ECE2] dark:hover:bg-[#1D2A22] transition-colors"
              title={`${expiringCount} items expiring soon`}
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {expiringCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#B46A1B] dark:bg-[#F59E0B] ring-2 ring-[#FAF7F2] dark:ring-[#0E1410]" />
              )}
            </button>
          </div>

          {/* Primary Action Button */}
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
            onClick={onOpenAddPantry}
          >
            <span className="hidden sm:inline">Add Ingredient</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

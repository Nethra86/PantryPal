import React, { useState, useRef, useEffect } from 'react';
import { Settings, LogOut, Sun, Moon, ChefHat, Check } from 'lucide-react';

export interface ProfileMenuProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onLogout?: () => void;
  userName?: string;
  userEmail?: string;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  isDark,
  onToggleTheme,
  onOpenSettings,
  onOpenAuth,
  onLogout,
  userName = 'Chef Rowan',
  userEmail = 'rowan@kitchen.local',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-[#F2ECE2] dark:hover:bg-[#1D2A22] transition-colors text-left group"
        aria-label="User Profile Menu"
      >
        <div className="w-9 h-9 rounded-xl bg-[#1C3B2B] dark:bg-emerald-500/20 text-[#E9F1EC] dark:text-emerald-300 flex items-center justify-center font-bold text-sm border border-[#162E21] dark:border-emerald-500/30 shrink-0">
          <ChefHat className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[#1D2420] dark:text-[#F2F5F3] truncate">
            {userName}
          </p>
          <p className="text-[11px] text-[#56645A] dark:text-[#A3B5AA] truncate">
            {userEmail}
          </p>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-56 rounded-2xl bg-white dark:bg-[#18221C] border border-[#E8E1D3] dark:border-[#23332A] shadow-xl p-1.5 z-50 animate-fadeIn text-sm">
          <div className="px-3 py-2 border-b border-[#F2EDE4] dark:border-[#223026]">
            <p className="text-xs font-semibold text-[#1D2420] dark:text-[#F2F5F3]">{userName}</p>
            <span className="text-[10px] text-[#56735D] dark:text-emerald-400 font-medium">
              Calm Kitchen Pro
            </span>
          </div>

          <div className="py-1 space-y-0.5">
            <button
              onClick={() => {
                onToggleTheme();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#1D2420] dark:text-[#E2EBE5] hover:bg-[#FAF7F2] dark:hover:bg-[#202E24] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {isDark ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4 text-[#56735D]" />}
                <span>{isDark ? 'Warm Ivory Theme' : 'Midnight Forest Theme'}</span>
              </div>
              <Check className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => {
                onOpenSettings();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#1D2420] dark:text-[#E2EBE5] hover:bg-[#FAF7F2] dark:hover:bg-[#202E24] transition-colors"
            >
              <Settings className="w-4 h-4 text-[#87968B]" />
              <span>Kitchen Settings</span>
            </button>
          </div>

          <div className="pt-1 border-t border-[#F2EDE4] dark:border-[#223026]">
            <button
              onClick={() => {
                if (onLogout) {
                  onLogout();
                } else {
                  onOpenAuth();
                }
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#A33A38] dark:text-[#F87171] hover:bg-[#FBF0EF] dark:hover:bg-[#2A1717] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


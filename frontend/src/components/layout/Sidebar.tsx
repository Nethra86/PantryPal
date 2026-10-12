import React from 'react';
import {
  Home,
  Refrigerator,
  ChefHat,
  Calendar,
  ShoppingCart,
  Settings,
  AlertCircle,
  Leaf
} from 'lucide-react';
import { ProfileMenu } from './ProfileMenu';

export interface SidebarProps {
  activeTab: 'dashboard' | 'recipes' | 'pantry' | 'grocery' | 'meal-plan' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'recipes' | 'pantry' | 'grocery' | 'meal-plan' | 'settings') => void;
  pantryCount: number;
  expiringCount: number;
  readyRecipeCount: number;
  unpurchasedGroceryCount: number;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onLogout?: () => void;
  userName?: string;
  userEmail?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pantryCount,
  expiringCount,
  readyRecipeCount,
  unpurchasedGroceryCount,
  isDark,
  onToggleTheme,
  onOpenSettings,
  onOpenAuth,
  onLogout,
  userName = 'Chef Rowan',
  userEmail = 'rowan@kitchen.local',
}) => {

  const navItems = [
    {
      id: 'dashboard',
      label: 'Home & Kitchen',
      icon: <Home className="w-4 h-4" />,
      badge: null,
    },
    {
      id: 'pantry',
      label: 'Pantry Stock',
      icon: <Refrigerator className="w-4 h-4" />,
      badge: expiringCount > 0 ? (
        <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#FDF6EC] text-[#B46A1B] dark:bg-[#2A1D0B] dark:text-[#F59E0B]">
          <AlertCircle className="w-3 h-3" />
          {expiringCount}
        </span>
      ) : (
        <span className="text-[10px] text-[#56645A] dark:text-[#87968B]">{pantryCount}</span>
      ),
    },
    {
      id: 'recipes',
      label: 'Recipe Matches',
      icon: <ChefHat className="w-4 h-4" />,
      badge: readyRecipeCount > 0 ? (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#EBF2EC] text-[#1C3B2B] dark:bg-[#182B1E] dark:text-emerald-400">
          {readyRecipeCount} ready
        </span>
      ) : null,
    },
    {
      id: 'meal-plan',
      label: 'Weekly Planner',
      icon: <Calendar className="w-4 h-4" />,
      badge: null,
    },
    {
      id: 'grocery',
      label: 'Shopping List',
      icon: <ShoppingCart className="w-4 h-4" />,
      badge: unpurchasedGroceryCount > 0 ? (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#1C3B2B] text-white dark:bg-emerald-500 dark:text-[#062415]">
          {unpurchasedGroceryCount}
        </span>
      ) : null,
    },
    {
      id: 'settings',
      label: 'Preferences',
      icon: <Settings className="w-4 h-4" />,
      badge: null,
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-[#FAF7F2] dark:bg-[#121914] border-r border-[#E8E1D3] dark:border-[#23332A] h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-6 pb-4 flex items-center justify-between border-b border-[#EAE3D6] dark:border-[#1E2C22]">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="w-10 h-10 rounded-2xl bg-[#1C3B2B] dark:bg-emerald-500/20 text-[#FAF7F2] dark:text-emerald-300 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform border border-[#162E21] dark:border-emerald-500/30">
            <Leaf className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-[#1D2420] dark:text-[#F2F5F3]">
                PantryPal
              </span>
            </div>
            <p className="text-[11px] text-[#56735D] dark:text-[#8DB896] font-medium -mt-0.5">
              Kitchen Companion
            </p>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="p-3.5 space-y-1 flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#87968B] dark:text-[#6D8074]">
          Main Kitchen
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-[#1C3B2B] text-white shadow-sm dark:bg-emerald-500 dark:text-[#062415]'
                  : 'text-[#56645A] dark:text-[#A3B5AA] hover:bg-[#F2ECE2] dark:hover:bg-[#1A251E] hover:text-[#1D2420] dark:hover:text-[#F2F5F3]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-inherit' : 'text-[#87968B] dark:text-[#6D8074]'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge}
            </button>
          );
        })}

        {/* Mini Freshness Radar Card */}
        {expiringCount > 0 && (
          <div className="mt-6 p-4 rounded-2xl bg-[#FDF6EC] dark:bg-[#20180F] border border-[#F3DCBD] dark:border-[#3D2811] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#B46A1B] dark:text-[#F59E0B]">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Rescue Ingredients</span>
            </div>
            <p className="text-[11px] text-[#6E4413] dark:text-[#D1974F] leading-relaxed">
              {expiringCount} perishable item{expiringCount > 1 ? 's' : ''} in your pantry approaching expiration.
            </p>
            <button
              onClick={() => setActiveTab('recipes')}
              className="text-xs font-semibold text-[#B46A1B] dark:text-[#F59E0B] hover:underline block pt-0.5"
            >
              See rescue recipes &rarr;
            </button>
          </div>
        )}
      </nav>

      {/* Profile & Settings Footer */}
      <div className="p-3 border-t border-[#EAE3D6] dark:border-[#1E2C22] bg-[#F7F2E9]/60 dark:bg-[#101712]">
        <ProfileMenu
          isDark={isDark}
          onToggleTheme={onToggleTheme}
          onOpenSettings={onOpenSettings}
          onOpenAuth={onOpenAuth}
          onLogout={onLogout}
          userName={userName}
          userEmail={userEmail}
        />

      </div>
    </aside>
  );
};

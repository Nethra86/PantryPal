import React from 'react';
import { Home, Refrigerator, ChefHat, Calendar, ShoppingCart } from 'lucide-react';

export interface MobileNavProps {
  activeTab: 'dashboard' | 'recipes' | 'pantry' | 'grocery' | 'meal-plan' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'recipes' | 'pantry' | 'grocery' | 'meal-plan' | 'settings') => void;
  expiringCount: number;
  unpurchasedGroceryCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
  expiringCount,
  unpurchasedGroceryCount,
}) => {
  const tabs = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: <Home className="w-5 h-5" />,
      badge: null,
    },
    {
      id: 'pantry',
      label: 'Pantry',
      icon: <Refrigerator className="w-5 h-5" />,
      badge: expiringCount > 0 ? (
        <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-[#B46A1B] dark:bg-[#F59E0B]" />
      ) : null,
    },
    {
      id: 'recipes',
      label: 'Recipes',
      icon: <ChefHat className="w-5 h-5" />,
      badge: null,
    },
    {
      id: 'meal-plan',
      label: 'Planner',
      icon: <Calendar className="w-5 h-5" />,
      badge: null,
    },
    {
      id: 'grocery',
      label: 'Shopping',
      icon: <ShoppingCart className="w-5 h-5" />,
      badge: unpurchasedGroceryCount > 0 ? (
        <span className="absolute top-1.5 right-3 px-1 py-0.2 rounded-full text-[9px] font-bold bg-[#1C3B2B] text-white dark:bg-emerald-500 dark:text-[#062415]">
          {unpurchasedGroceryCount}
        </span>
      ) : null,
    },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF7F2]/95 dark:bg-[#0E1410]/95 backdrop-blur-lg border-t border-[#E8E1D3] dark:border-[#23332A] shadow-lg"
      style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 relative select-none transition-all ${
                isActive
                  ? 'text-[#1C3B2B] dark:text-emerald-400 font-bold'
                  : 'text-[#87968B] dark:text-[#6D8074] hover:text-[#56645A] font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-[#EBF2EC] dark:bg-[#182B1E]' : ''
                }`}
              >
                {tab.icon}
              </div>
              <span className="text-[11px] tracking-tight">{tab.label}</span>
              {tab.badge}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

import React from 'react';
import { ChefHat, Refrigerator, ShoppingCart, Calendar, BarChart3, Plus, AlertCircle } from 'lucide-react';

interface NavbarProps {
  activeTab: 'recipes' | 'pantry' | 'grocery' | 'meal-plan' | 'stats';
  setActiveTab: (tab: 'recipes' | 'pantry' | 'grocery' | 'meal-plan' | 'stats') => void;
  groceryCount: number;
  expiringCount: number;
  onOpenAddPantry: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  groceryCount,
  expiringCount,
  onOpenAddPantry,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setActiveTab('recipes')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
                PantryPal
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-0.5">Smart Pantry Matcher</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'recipes'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Recipes</span>
          </button>

          <button
            onClick={() => setActiveTab('pantry')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all relative ${
              activeTab === 'pantry'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Refrigerator className="w-4 h-4" />
            <span>Pantry</span>
            {expiringCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                <AlertCircle className="w-3 h-3" />
                {expiringCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('grocery')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all relative ${
              activeTab === 'grocery'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Grocery</span>
            {groceryCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {groceryCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('meal-plan')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'meal-plan'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Meal Plan</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'stats'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Insights</span>
          </button>
        </nav>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAddPantry}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Add Ingredient</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="md:hidden flex items-center justify-around py-2 px-1 border-t border-slate-800/60 bg-slate-950/80">
        <button
          onClick={() => setActiveTab('recipes')}
          className={`flex flex-col items-center gap-1 p-2 text-xs font-medium ${
            activeTab === 'recipes' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <ChefHat className="w-5 h-5" />
          <span>Recipes</span>
        </button>
        <button
          onClick={() => setActiveTab('pantry')}
          className={`flex flex-col items-center gap-1 p-2 text-xs font-medium relative ${
            activeTab === 'pantry' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <Refrigerator className="w-5 h-5" />
          <span>Pantry</span>
          {expiringCount > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('grocery')}
          className={`flex flex-col items-center gap-1 p-2 text-xs font-medium relative ${
            activeTab === 'grocery' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Grocery</span>
          {groceryCount > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('meal-plan')}
          className={`flex flex-col items-center gap-1 p-2 text-xs font-medium ${
            activeTab === 'meal-plan' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>Plan</span>
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center gap-1 p-2 text-xs font-medium ${
            activeTab === 'stats' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span>Stats</span>
        </button>
      </div>
    </header>
  );
};

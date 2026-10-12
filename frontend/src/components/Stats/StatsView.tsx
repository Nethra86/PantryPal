import React from 'react';
import {
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  TrendingUp,
  Leaf,
  Package
} from 'lucide-react';
import { Stats, PantryItem, RecipeMatch } from '../../types';

interface StatsViewProps {
  stats: Stats | null;
  pantryItems: PantryItem[];
  recipes: RecipeMatch[];
  onRescueItem: (ingredientName: string) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  stats,
  pantryItems,
  recipes: _recipes,
  onRescueItem,
}) => {
  if (!stats) return null;

  // Find expiring items
  const expiringItems = pantryItems.filter((i) => i.freshness_status === 'expiring_soon');

  // Compute category breakdown
  const categoryCounts: { [key: string]: number } = {};
  pantryItems.forEach((item) => {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  });

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Kitchen Analytics & Freshness Health</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Pantry Health & Impact
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Real-time analytics on your kitchen inventory turnover, food waste prevention, and recipe readiness.
          </p>
        </div>

        {/* Health Score Ring */}
        <div className="flex items-center gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-700/80 self-start md:self-auto">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-400"
                strokeDasharray={`${stats.pantry_health_score}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-sm font-extrabold text-white">
              {stats.pantry_health_score}%
            </span>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Health Score</span>
            <span className="text-sm font-semibold text-emerald-300">
              {stats.pantry_health_score > 80 ? 'Optimal & Fresh' : 'Needs Attention'}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Ready to Cook</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{stats.ready_to_cook_count}</div>
          <span className="text-xs text-slate-400 mt-1 block">100% matched recipes</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Stock</span>
            <Package className="w-5 h-5 text-teal-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{stats.total_pantry_items}</div>
          <span className="text-xs text-slate-400 mt-1 block">Active ingredients</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Expiring Soon</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">{stats.items_expiring_soon}</div>
          <span className="text-xs text-slate-400 mt-1 block">&le; 3 days shelf life</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Almost Ready</span>
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{stats.recipes_missing_one}</div>
          <span className="text-xs text-slate-400 mt-1 block">Only missing 1 ingredient</span>
        </div>
      </div>

      {/* Freshness Radar & Rescue Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Rescues */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Rescue Expiring Food</h3>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300">
              {expiringItems.length} Urgent
            </span>
          </div>

          {expiringItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-white">Zero food waste imminent!</p>
              <p className="text-xs mt-1">All pantry items have plenty of shelf life remaining.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expiringItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30"
                >
                  <div>
                    <h4 className="text-sm font-bold text-white">{item.name}</h4>
                    <p className="text-xs text-amber-300">
                      {item.quantity} {item.unit} in {item.location} • Expires in {item.days_until_expiry} day(s)
                    </p>
                  </div>
                  <button
                    onClick={() => onRescueItem(item.name)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                  >
                    Find Recipe
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
            <BarChart3 className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">Stock by Department</h3>
          </div>

          <div className="space-y-3">
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const pct = Math.round((count / (pantryItems.length || 1)) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">{cat}</span>
                    <span className="text-slate-400">{count} items ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

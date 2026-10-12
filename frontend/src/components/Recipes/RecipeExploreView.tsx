import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  Plus,
  ArrowUpDown,
  Heart,
  Clock,
  Info
} from 'lucide-react';
import { RecipeMatch } from '../../types';
import { RecipeCard } from './RecipeCard';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { EmptyRecipeIllustration } from '../illustrations/EmptyIllustrations';

interface RecipeExploreViewProps {
  recipes: RecipeMatch[];
  onSelectRecipe: (recipe: RecipeMatch) => void;
  onAddMissingToGrocery: (recipeId: number) => void;
  onOpenCreateRecipe: () => void;
  onToggleFavorite?: (recipeId: number) => void;
}

const NEAR_MATCH_FILTERS = [
  { id: 'all', label: 'All Matches' },
  { id: 'ready', label: 'Ready to Cook' },
  { id: 'types_available', label: 'All Types Available' },
  { id: 'missing_one', label: 'Missing 1 Item' },
  { id: 'missing_few', label: 'Missing ≤2 Items' },
];

const DIETARY_FILTERS = [
  { id: 'all', label: 'All Diets' },
  { id: 'Vegetarian', label: 'Vegetarian' },
  { id: 'Vegan', label: 'Vegan' },
  { id: 'Gluten-Free', label: 'Gluten-Free' },
  { id: 'High-Protein', label: 'High-Protein' },
  { id: 'Dairy-Free', label: 'Dairy-Free' },
  { id: 'Keto', label: 'Keto' },
];

const TIME_FILTERS = [
  { id: 'all', label: 'Any Duration' },
  { id: 'quick', label: '≤ 15 mins (Quick)' },
  { id: 'under_30', label: '≤ 30 mins' },
  { id: 'under_45', label: '≤ 45 mins' },
  { id: 'over_45', label: '45+ mins' },
];

export const RecipeExploreView: React.FC<RecipeExploreViewProps> = ({
  recipes,
  onSelectRecipe,
  onAddMissingToGrocery,
  onOpenCreateRecipe,
  onToggleFavorite,
}) => {
  const [search, setSearch] = useState('');
  const [selectedNearMatch, setSelectedNearMatch] = useState('all');
  const [selectedDiet, setSelectedDiet] = useState('all');
  const [selectedTime, setSelectedTime] = useState('all');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [savedOnly, setSavedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('match_desc');

  // Filter recipes
  const filtered = recipes.filter((r) => {
    // 1. Search Query
    if (search.trim()) {
      const q = search.toLowerCase();
      const inTitle = r.title.toLowerCase().includes(q);
      const inDesc = (r.description || '').toLowerCase().includes(q);
      const inCuisine = (r.cuisine || '').toLowerCase().includes(q);
      const inIng = r.ingredients.some((i) => i.ingredient_name.toLowerCase().includes(q));
      if (!inTitle && !inDesc && !inCuisine && !inIng) return false;
    }

    // 2. Saved / Bookmarked filter
    if (savedOnly && !r.is_favorite) return false;

    // 3. Cuisine filter
    if (selectedCuisine !== 'All' && r.cuisine !== selectedCuisine) return false;

    // 4. Near-match filter
    if (selectedNearMatch === 'ready' && r.readiness_status !== 'ready_to_cook') return false;
    if (selectedNearMatch === 'types_available' && r.missing_count !== 0) return false;
    if (selectedNearMatch === 'missing_one' && r.missing_count !== 1) return false;
    if (selectedNearMatch === 'missing_few' && (r.missing_count === 0 || r.missing_count > 2)) return false;

    // 5. Dietary filter (CRITICAL RULE: Include vegan recipes in vegetarian results)
    if (selectedDiet !== 'all') {
      const d = selectedDiet.toLowerCase();
      const tags = (r.dietary_tags || '').toLowerCase();
      if (d === 'vegetarian') {
        if (!tags.includes('vegetarian') && !tags.includes('vegan')) return false;
      } else {
        if (!tags.includes(d)) return false;
      }
    }

    // 6. Cooking time filter
    const totalTime = (r.prep_time_minutes || 0) + (r.cook_time_minutes || 0);
    if (selectedTime === 'quick' && totalTime > 15) return false;
    if (selectedTime === 'under_30' && totalTime > 30) return false;
    if (selectedTime === 'under_45' && totalTime > 45) return false;
    if (selectedTime === 'over_45' && totalTime <= 45) return false;

    return true;
  });

  // Sort recipes deterministically:
  // Default match_desc: Match percentage (DESC) -> Use-soon expiring count (DESC) -> Cook time (ASC) -> Prep time (ASC) -> ID (ASC)
  filtered.sort((a, b) => {
    if (sortBy === 'match_desc') {
      if (b.match_percentage !== a.match_percentage) {
        return b.match_percentage - a.match_percentage;
      }
      if (b.rescues_expiring_count !== a.rescues_expiring_count) {
        return b.rescues_expiring_count - a.rescues_expiring_count;
      }
      if (a.cook_time_minutes !== b.cook_time_minutes) {
        return a.cook_time_minutes - b.cook_time_minutes;
      }
      return (a.prep_time_minutes || 0) - (b.prep_time_minutes || 0) || a.id - b.id;
    } else if (sortBy === 'rescues_desc') {
      if (b.rescues_expiring_count !== a.rescues_expiring_count) {
        return b.rescues_expiring_count - a.rescues_expiring_count;
      }
      return b.match_percentage - a.match_percentage || a.cook_time_minutes - b.cook_time_minutes || a.id - b.id;
    } else if (sortBy === 'time_asc') {
      const aTime = (a.prep_time_minutes || 0) + (a.cook_time_minutes || 0);
      const bTime = (b.prep_time_minutes || 0) + (b.cook_time_minutes || 0);
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return b.match_percentage - a.match_percentage || a.id - b.id;
    }
    return 0;
  });

  const cuisines = ['All', ...Array.from(new Set(recipes.map((r) => r.cuisine).filter(Boolean)))];
  const readyCount = recipes.filter((r) => r.readiness_status === 'ready_to_cook').length;
  const typesAvailableCount = recipes.filter((r) => r.missing_count === 0).length;
  const savedCount = recipes.filter((r) => r.is_favorite).length;

  return (
    <div className="space-y-5 animate-fadeIn pb-12 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1D2420] dark:text-[#F2F5F3]">
            Recipe Discovery & Smart Matcher
          </h2>
          <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] mt-1">
            Matching your available non-expired kitchen stock across {recipes.length} culinary recipes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={onOpenCreateRecipe}
          >
            Create Custom Recipe
          </Button>
        </div>
      </div>

      {/* Safety & Reminder Disclaimer Banner */}
      <div className="p-3.5 rounded-2xl bg-[#EBF2EC]/70 dark:bg-[#182B1E]/60 border border-[#C8D9CB] dark:border-[#2B4734] flex items-center justify-between gap-3 text-xs text-[#1C3B2B] dark:text-emerald-300">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 shrink-0 text-[#1C3B2B] dark:text-emerald-400" />
          <span>
            <strong>Reminder:</strong> Dates and allergen tags are organizational guides, not certified food-safety guarantees. Expired items are excluded from matching by default.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0 text-[11px] font-semibold">
          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#202E24] border border-[#C8D9CB] dark:border-[#2B4734]">
            {readyCount} Ready to Cook
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#202E24] border border-[#C8D9CB] dark:border-[#2B4734]">
            {typesAvailableCount} All Types in Stock
          </span>
        </div>
      </div>

      {/* Search Bar & Primary Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#87968B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes by title, ingredients, or cuisine..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-[#E2DBD0] dark:border-[#25362C] bg-white dark:bg-[#16201A] text-xs text-[#1D2420] dark:text-[#F2F5F3] placeholder-[#87968B] focus:outline-none focus:border-[#1C3B2B] dark:focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Cuisine Selector */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white dark:bg-[#16201A] border border-[#E2DBD0] dark:border-[#25362C] text-xs text-[#56645A] dark:text-[#A3B5AA]">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <select
                value={selectedCuisine}
                onChange={(e) => setSelectedCuisine(e.target.value)}
                className="bg-transparent text-xs text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none"
              >
                {cuisines.map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-[#18221C]">
                    {c} {c === 'All' ? 'Cuisines' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Cooking Time Selector */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white dark:bg-[#16201A] border border-[#E2DBD0] dark:border-[#25362C] text-xs text-[#56645A] dark:text-[#A3B5AA]">
              <Clock className="w-3.5 h-3.5" />
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="bg-transparent text-xs text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none"
              >
                {TIME_FILTERS.map((t) => (
                  <option key={t.id} value={t.id} className="bg-white dark:bg-[#18221C]">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Deterministic Sort Selector */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white dark:bg-[#16201A] border border-[#E2DBD0] dark:border-[#25362C] text-xs text-[#56645A] dark:text-[#A3B5AA]">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none"
              >
                <option value="match_desc" className="bg-white dark:bg-[#18221C]">
                  Best Match (Score → Use-Soon → Time)
                </option>
                <option value="rescues_desc" className="bg-white dark:bg-[#18221C]">
                  Rescues Most Expiring Food
                </option>
                <option value="time_asc" className="bg-white dark:bg-[#18221C]">
                  Fastest Total Time
                </option>
              </select>
            </div>

            {/* Saved / Bookmarks Filter Toggle */}
            <button
              type="button"
              onClick={() => setSavedOnly(!savedOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold border transition-all ${
                savedOnly
                  ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400'
                  : 'bg-white dark:bg-[#16201A] border-[#E2DBD0] dark:border-[#25362C] text-[#56645A] dark:text-[#A3B5AA] hover:border-rose-300'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${savedOnly ? 'fill-current text-rose-500' : ''}`} />
              <span>Saved ({savedCount})</span>
            </button>
          </div>
        </div>

        {/* Near-Match Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <span className="text-[11px] font-bold text-[#87968B] uppercase tracking-wider shrink-0 mr-1">
            Match:
          </span>
          {NEAR_MATCH_FILTERS.map((f) => {
            const active = selectedNearMatch === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedNearMatch(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  active
                    ? 'bg-[#1C3B2B] text-white border-[#1C3B2B] dark:bg-emerald-500 dark:text-[#062415] dark:border-emerald-500 shadow-sm'
                    : 'bg-white dark:bg-[#16201A] text-[#56645A] dark:text-[#A3B5AA] border-[#E2DBD0] dark:border-[#25362C] hover:border-[#1C3B2B]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Dietary Filter Pills (Includes Vegan in Vegetarian!) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <span className="text-[11px] font-bold text-[#87968B] uppercase tracking-wider shrink-0 mr-1">
            Diet:
          </span>
          {DIETARY_FILTERS.map((tag) => {
            const active = selectedDiet === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => setSelectedDiet(tag.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  active
                    ? 'bg-[#56735D] text-white border-[#56735D] dark:bg-emerald-600 dark:text-white dark:border-emerald-600 shadow-sm'
                    : 'bg-white dark:bg-[#16201A] text-[#56645A] dark:text-[#A3B5AA] border-[#E2DBD0] dark:border-[#25362C] hover:border-[#56735D]'
                }`}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count & Active Filters Summary */}
      <div className="flex items-center justify-between text-xs text-[#56645A] dark:text-[#A3B5AA] pt-1 border-t border-[#F2EDE4] dark:border-[#1F2C24]">
        <span>
          Showing <strong>{filtered.length}</strong> of {recipes.length} recipes
          {selectedDiet !== 'all' && ` • Diet: ${selectedDiet}`}
          {selectedNearMatch !== 'all' && ` • Match: ${selectedNearMatch}`}
          {savedOnly && ' • Saved Only'}
        </span>
        {(search || selectedNearMatch !== 'all' || selectedDiet !== 'all' || selectedTime !== 'all' || selectedCuisine !== 'All' || savedOnly) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedNearMatch('all');
              setSelectedDiet('all');
              setSelectedTime('all');
              setSelectedCuisine('All');
              setSavedOnly(false);
            }}
            className="text-xs font-semibold text-[#1C3B2B] dark:text-emerald-400 hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Recipe Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No recipes match your criteria"
          description="Try relaxing your dietary preferences, near-match constraints, or search keywords to explore more culinary dishes."
          illustration={<EmptyRecipeIllustration />}
          action={{
            label: 'Show All Recipes',
            onClick: () => {
              setSearch('');
              setSelectedNearMatch('all');
              setSelectedDiet('all');
              setSelectedTime('all');
              setSelectedCuisine('All');
              setSavedOnly(false);
            },
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onSelect={onSelectRecipe}
              onAddMissingToGrocery={onAddMissingToGrocery}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};

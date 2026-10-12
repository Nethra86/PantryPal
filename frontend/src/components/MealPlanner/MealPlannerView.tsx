import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import {
  MealPlan,
  RecipeMatch,
  GenerateWeekShoppingResponse
} from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Dialog } from '../ui/Dialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { RecipeArt } from '../illustrations/RecipeArt';

interface MealPlannerViewProps {
  mealPlans: MealPlan[];
  recipes: RecipeMatch[];
  onAssignMeal: (payload: {
    plan_date: string;
    day_of_week: string;
    meal_slot: string;
    recipe_id?: number | null;
    custom_meal_name?: string | null;
    planned_servings: number;
    notes?: string | null;
    replace_existing?: boolean;
  }) => Promise<void>;
  onUpdateMealPlan?: (
    planId: number,
    payload: {
      planned_servings?: number;
      custom_meal_name?: string | null;
      notes?: string | null;
    }
  ) => Promise<void>;
  onRemoveMeal: (planId: number) => Promise<void>;
  onGenerateWeekShopping?: (
    startDate: string,
    endDate: string
  ) => Promise<GenerateWeekShoppingResponse | null>;
  onSelectRecipe: (recipe: RecipeMatch) => void;
  onNavigateToShopping?: () => void;
}

const DAYS_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // day 0 is Sunday in JS, so diff to Monday is -6; day 1 is Monday, diff 0
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const MealPlannerView: React.FC<MealPlannerViewProps> = ({
  mealPlans,
  recipes,
  onAssignMeal,
  onUpdateMealPlan,
  onRemoveMeal,
  onGenerateWeekShopping,
  onSelectRecipe,
  onNavigateToShopping,
}) => {
  // Weekly Navigation State
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() => getStartOfWeek(new Date()));

  // Active slot for assigning meal
  const [activeSlotModal, setActiveSlotModal] = useState<{
    dateStr: string;
    dayName: string;
    slot: string;
    existingPlan?: MealPlan;
  } | null>(null);

  // Tab inside Assign Modal ('recipe' | 'custom')
  const [assignTab, setAssignTab] = useState<'recipe' | 'custom'>('recipe');
  const [customMealName, setCustomMealName] = useState('');
  const [plannedServings, setPlannedServings] = useState<number>(2);
  const [slotNotes, setSlotNotes] = useState('');
  const [recipeSearch, setRecipeSearch] = useState('');

  // Confirmation dialog for replacing occupied slot
  const [confirmReplaceData, setConfirmReplaceData] = useState<{
    targetPayload: {
      plan_date: string;
      day_of_week: string;
      meal_slot: string;
      recipe_id?: number | null;
      custom_meal_name?: string | null;
      planned_servings: number;
      notes?: string | null;
      replace_existing?: boolean;
    };
    existingTitle: string;
    newTitle: string;
  } | null>(null);

  // Servings quick editor state
  const [editingServingsPlan, setEditingServingsPlan] = useState<MealPlan | null>(null);
  const [editServingsValue, setEditServingsValue] = useState<number>(2);

  // Shopping List Generation Explanation Modal State
  const [generatingLoading, setGeneratingLoading] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerateWeekShoppingResponse | null>(null);

  // Calculate 7 dates for current week
  const weekDays = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekMonday);
      d.setDate(d.getDate() + i);
      const iso = formatDateISO(d);
      const dayName = DAYS_NAMES[i];
      const isToday = iso === formatDateISO(new Date());
      return {
        date: d,
        iso,
        dayName,
        isToday,
      };
    });
  }, [currentWeekMonday]);

  const weekStartISO = weekDays[0].iso;
  const weekEndISO = weekDays[6].iso;

  // Filter plans belonging to the current displayed week
  const weekPlans = React.useMemo(() => {
    return mealPlans.filter((p) => {
      if (p.plan_date) {
        return p.plan_date >= weekStartISO && p.plan_date <= weekEndISO;
      }
      // Fallback for legacy plans with day_of_week only
      return p.day_of_week && DAYS_NAMES.includes(p.day_of_week);
    });
  }, [mealPlans, weekStartISO, weekEndISO]);

  // Week navigation helpers
  const handlePrevWeek = () => {
    const prev = new Date(currentWeekMonday);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekMonday);
    next.setDate(next.getDate() + 7);
    setCurrentWeekMonday(next);
  };

  const handleCurrentWeek = () => {
    setCurrentWeekMonday(getStartOfWeek(new Date()));
  };

  const handleDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const picked = new Date(e.target.value + 'T00:00:00');
    setCurrentWeekMonday(getStartOfWeek(picked));
  };

  // Open Assign Modal for a slot
  const handleOpenAssignModal = (dateStr: string, dayName: string, slot: string, existingPlan?: MealPlan) => {
    setActiveSlotModal({ dateStr, dayName, slot, existingPlan });
    setAssignTab('recipe');
    setCustomMealName('');
    setPlannedServings(existingPlan ? existingPlan.planned_servings : 2);
    setSlotNotes(existingPlan?.notes || '');
    setRecipeSearch('');
  };

  // When a dish is chosen in modal
  const handleAttemptAssign = async (recipe?: RecipeMatch) => {
    if (!activeSlotModal) return;

    const payload = {
      plan_date: activeSlotModal.dateStr,
      day_of_week: activeSlotModal.dayName,
      meal_slot: activeSlotModal.slot,
      recipe_id: recipe ? recipe.id : null,
      custom_meal_name: recipe ? null : customMealName.trim() || 'Custom Meal',
      planned_servings: plannedServings || 2,
      notes: slotNotes.trim() || null,
      replace_existing: false,
    };

    const newTitle = recipe ? recipe.title : customMealName.trim() || 'Custom Meal';

    // Check if slot is already occupied
    if (activeSlotModal.existingPlan) {
      const existing = activeSlotModal.existingPlan;
      const existingTitle = existing.recipe?.title || existing.custom_meal_name || 'Scheduled Meal';
      setConfirmReplaceData({
        targetPayload: { ...payload, replace_existing: true },
        existingTitle,
        newTitle,
      });
      return;
    }

    await onAssignMeal(payload);
    setActiveSlotModal(null);
  };

  // Confirm replacement
  const handleConfirmReplace = async () => {
    if (!confirmReplaceData) return;
    await onAssignMeal(confirmReplaceData.targetPayload);
    setConfirmReplaceData(null);
    setActiveSlotModal(null);
  };

  // Generate Shopping List for the current displayed week
  const handleGenerateShoppingForWeek = async () => {
    if (!onGenerateWeekShopping) return;

    setGeneratingLoading(true);
    try {
      const result = await onGenerateWeekShopping(weekStartISO, weekEndISO);
      if (result) {
        setGenerationResult(result);
      }
    } finally {
      setGeneratingLoading(false);
    }
  };

  // Save quick servings adjustment
  const handleSaveServings = async () => {
    if (!editingServingsPlan || !onUpdateMealPlan) return;
    await onUpdateMealPlan(editingServingsPlan.id, {
      planned_servings: editServingsValue,
    });
    setEditingServingsPlan(null);
  };

  // Filtered recipes for assignment picker
  const filteredRecipes = React.useMemo(() => {
    if (!recipeSearch.trim()) return recipes;
    const q = recipeSearch.toLowerCase();
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q) ||
        r.meal_type.toLowerCase().includes(q)
    );
  }, [recipes, recipeSearch]);

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto pb-12 text-left">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1D2420] dark:text-[#F2F5F3] flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-[#56735D] dark:text-emerald-400" />
            <span>Weekly Meal Planner</span>
          </h2>
          <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] mt-1">
            Schedule nourishing Breakfast, Lunch, Dinner, and Snacks. Automatically generate shopping lists with pantry stock matching.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Weekly Navigation Controls */}
          <div className="flex items-center rounded-xl bg-white dark:bg-[#18221C] border border-[#E8E1D3] dark:border-[#23332A] p-1 shadow-sm">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 rounded-lg text-[#56645A] dark:text-[#A3B5AA] hover:text-[#1D2420] dark:hover:text-white hover:bg-[#FAF7F2] dark:hover:bg-[#202E24] transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 text-xs font-bold text-[#1D2420] dark:text-[#F2F5F3]">
              {formatShortDate(weekDays[0].date)} – {formatShortDate(weekDays[6].date)}
            </span>

            <button
              onClick={handleNextWeek}
              className="p-1.5 rounded-lg text-[#56645A] dark:text-[#A3B5AA] hover:text-[#1D2420] dark:hover:text-white hover:bg-[#FAF7F2] dark:hover:bg-[#202E24] transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Jump to Today Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCurrentWeek}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            title="Jump to current week"
          >
            This Week
          </Button>

          {/* Date Picker Jump */}
          <input
            type="date"
            onChange={handleDatePick}
            className="px-2.5 py-1.5 rounded-xl border border-[#E8E1D3] dark:border-[#23332A] bg-white dark:bg-[#18221C] text-xs text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none"
            title="Pick a date to jump"
          />

          {/* Generate Shopping List Button */}
          <Button
            variant="primary"
            size="sm"
            isLoading={generatingLoading}
            disabled={weekPlans.length === 0}
            leftIcon={<ShoppingBag className="w-4 h-4" />}
            onClick={handleGenerateShoppingForWeek}
          >
            Sync Week to Shopping List
          </Button>
        </div>
      </div>

      {/* 7-Day Visual Planner Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3.5">
        {weekDays.map(({ date, iso, dayName, isToday }) => {
          // Find plans for this specific day
          const dayPlans = weekPlans.filter(
            (p) => p.plan_date === iso || (!p.plan_date && p.day_of_week === dayName)
          );

          return (
            <div
              key={iso}
              className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-sm ${
                isToday
                  ? 'border-emerald-500/80 dark:border-emerald-500 ring-2 ring-emerald-500/20 bg-white dark:bg-[#18221C]'
                  : 'border-[#E8E1D3] dark:border-[#23332A] bg-white dark:bg-[#18221C]'
              }`}
            >
              {/* Day Header */}
              <div
                className={`p-3 border-b text-center flex flex-col items-center justify-center gap-0.5 ${
                  isToday
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                    : 'bg-[#FAF7F2] dark:bg-[#141C16] border-[#E8E1D3] dark:border-[#23332A]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1D2420] dark:text-[#F2F5F3]">
                    {dayName}
                  </span>
                  {isToday && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white">
                      Today
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-[#87968B]">
                  {formatShortDate(date)}
                </span>
              </div>

              {/* Meal Slots (Breakfast, Lunch, Dinner, Snack) */}
              <div className="p-2 space-y-2 flex-1">
                {SLOTS.map((slot) => {
                  const plan = dayPlans.find((p) => p.meal_slot.toLowerCase() === slot.toLowerCase());

                  return (
                    <div
                      key={slot}
                      className={`p-2.5 rounded-xl border space-y-1 relative group transition-all ${
                        plan
                          ? 'bg-[#FAF7F2] dark:bg-[#131B16] border-[#EAE3D6] dark:border-[#202C23]'
                          : 'bg-[#FCFAF7] dark:bg-[#101712] border-dashed border-[#E8E1D3] dark:border-[#212E25]'
                      }`}
                    >
                      {/* Slot Header */}
                      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#87968B]">
                        <span>{slot}</span>
                        {plan && (
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            {/* Quick Servings Adjuster */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingServingsPlan(plan);
                                setEditServingsValue(plan.planned_servings || 2);
                              }}
                              className="px-1 py-0.5 rounded text-[9px] font-semibold text-[#56735D] dark:text-emerald-400 hover:bg-[#EBF2EC] dark:hover:bg-[#1B2D21] transition-colors"
                              title="Adjust planned servings"
                            >
                              {plan.planned_servings || 2} serv
                            </button>

                            {/* Replace Meal */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAssignModal(iso, dayName, slot, plan);
                              }}
                              className="p-0.5 text-[#87968B] hover:text-[#56735D] dark:hover:text-emerald-400 transition-colors"
                              title="Replace meal"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>

                            {/* Remove Plan */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveMeal(plan.id);
                              }}
                              className="p-0.5 text-[#87968B] hover:text-[#A33A38] dark:hover:text-[#F87171] transition-colors"
                              title="Remove meal"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Slot Content */}
                      {plan ? (
                        <div
                          onClick={() => {
                            if (plan.recipe) {
                              onSelectRecipe(plan.recipe);
                            } else {
                              handleOpenAssignModal(iso, dayName, slot, plan);
                            }
                          }}
                          className="cursor-pointer group/item pt-0.5"
                        >
                          <p className="text-xs font-bold text-[#1D2420] dark:text-[#F2F5F3] group-hover/item:text-[#1C3B2B] dark:group-hover/item:text-emerald-400 transition-colors line-clamp-2">
                            {plan.recipe ? plan.recipe.title : plan.custom_meal_name || 'Custom Meal'}
                          </p>

                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {plan.recipe ? (
                              plan.recipe.can_cook_now ? (
                                <Badge variant="ready" size="sm">
                                  100% In Stock
                                </Badge>
                              ) : (
                                <Badge variant="amber" size="sm">
                                  Missing {plan.recipe.missing_count}
                                </Badge>
                              )
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#EDE6DC] dark:bg-[#202E24] text-[#56645A] dark:text-[#A3B5AA]">
                                Custom Dish
                              </span>
                            )}
                          </div>

                          {plan.notes && (
                            <p className="text-[10px] text-[#87968B] italic truncate mt-1">
                              “{plan.notes}”
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenAssignModal(iso, dayName, slot)}
                          className="w-full py-2 border border-dashed border-[#DDD5C8] dark:border-[#2B3B30] hover:border-[#1C3B2B] dark:hover:border-emerald-500 rounded-lg flex items-center justify-center gap-1 text-[11px] text-[#87968B] hover:text-[#1D2420] dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#162019] transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Assign</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recipe / Custom Meal Picker Modal */}
      {activeSlotModal && (
        <Dialog
          isOpen={!!activeSlotModal}
          onClose={() => setActiveSlotModal(null)}
          title={`Schedule ${activeSlotModal.slot}`}
          description={`${activeSlotModal.dayName}, ${activeSlotModal.dateStr} • Scale planned servings and select a dish.`}
          maxWidth="lg"
        >
          <div className="space-y-4 pt-1">
            {/* Occupied Slot Notice */}
            {activeSlotModal.existingPlan && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-[#2A1D0B] border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Currently occupied by: <strong>{activeSlotModal.existingPlan.recipe?.title || activeSlotModal.existingPlan.custom_meal_name}</strong>. Choosing a new meal will prompt to replace it.
                </span>
              </div>
            )}

            {/* Servings & Notes Row */}
            <div className="p-3 rounded-2xl bg-[#FAF7F2] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A] grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#56645A] dark:text-[#A3B5AA] mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#56735D]" />
                  <span>Planned Servings</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={plannedServings}
                    onChange={(e) => setPlannedServings(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0E1410] border border-[#E8E1D3] dark:border-[#23332A] text-xs font-bold text-center text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none"
                  />
                  <span className="text-xs text-[#87968B]">
                    Ingredients scale automatically
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#56645A] dark:text-[#A3B5AA] mb-1">
                  Optional Slot Note
                </label>
                <input
                  type="text"
                  value={slotNotes}
                  onChange={(e) => setSlotNotes(e.target.value)}
                  placeholder="e.g. Quick breakfast, dinner with guests..."
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#0E1410] border border-[#E8E1D3] dark:border-[#23332A] text-xs text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none"
                />
              </div>
            </div>

            {/* Tabs: Kitchen Recipes vs Custom Dish */}
            <div className="flex border-b border-[#E8E1D3] dark:border-[#23332A]">
              <button
                type="button"
                onClick={() => setAssignTab('recipe')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
                  assignTab === 'recipe'
                    ? 'border-[#1C3B2B] text-[#1C3B2B] dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-[#87968B] hover:text-[#1D2420] dark:hover:text-white'
                }`}
              >
                Kitchen Recipes ({recipes.length})
              </button>
              <button
                type="button"
                onClick={() => setAssignTab('custom')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
                  assignTab === 'custom'
                    ? 'border-[#1C3B2B] text-[#1C3B2B] dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-[#87968B] hover:text-[#1D2420] dark:hover:text-white'
                }`}
              >
                Custom Meal
              </button>
            </div>

            {/* Recipe Selection Tab */}
            {assignTab === 'recipe' && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  placeholder="Search recipes by title, cuisine, or meal type..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A] text-xs text-[#1D2420] dark:text-[#F2F5F3] placeholder-[#87968B] focus:outline-none"
                />

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {filteredRecipes.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => handleAttemptAssign(r)}
                      className="p-3 rounded-2xl bg-white dark:bg-[#152019] hover:bg-[#EBF2EC] dark:hover:bg-[#1A2E21] border border-[#E8E1D3] dark:border-[#23332A] cursor-pointer transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-[#243329]">
                          <RecipeArt title={r.title} cuisine={r.cuisine} mealType={r.meal_type} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1D2420] dark:text-[#F2F5F3] group-hover:text-[#1C3B2B] dark:group-hover:text-emerald-400 transition-colors truncate">
                            {r.title}
                          </p>
                          <span className="text-[10px] text-[#87968B]">
                            {r.cuisine} • {r.prep_time_minutes + r.cook_time_minutes}m • Base {r.servings} serv
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {r.can_cook_now ? (
                          <Badge variant="ready" size="sm">
                            100% In Stock
                          </Badge>
                        ) : (
                          <Badge variant="amber" size="sm">
                            {r.match_percentage}% match
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                          Select
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Meal Tab */}
            {assignTab === 'custom' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[#56645A] dark:text-[#A3B5AA] mb-1">
                    Custom Dish Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customMealName}
                    onChange={(e) => setCustomMealName(e.target.value)}
                    placeholder="e.g. Grandma's Minestrone, Avocado Sourdough, Takeout Sushi..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A] text-xs text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none"
                  />
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={!customMealName.trim()}
                  onClick={() => handleAttemptAssign()}
                  className="w-full"
                >
                  Schedule Custom Meal
                </Button>
              </div>
            )}
          </div>
        </Dialog>
      )}

      {/* Confirm Replacement Dialog */}
      {confirmReplaceData && (
        <ConfirmDialog
          isOpen={!!confirmReplaceData}
          onClose={() => setConfirmReplaceData(null)}
          onConfirm={handleConfirmReplace}
          title="Replace Occupied Slot?"
          description={`Slot '${confirmReplaceData.targetPayload.meal_slot}' on ${confirmReplaceData.targetPayload.plan_date} already has "${confirmReplaceData.existingTitle}". Overwrite with "${confirmReplaceData.newTitle}"?`}
          confirmText="Yes, Replace Meal"
          cancelText="Cancel"
          variant="amber"
        />
      )}

      {/* Quick Servings Editor Dialog */}
      {editingServingsPlan && (
        <Dialog
          isOpen={!!editingServingsPlan}
          onClose={() => setEditingServingsPlan(null)}
          title="Adjust Planned Servings"
          description={`Update servings for ${editingServingsPlan.recipe?.title || editingServingsPlan.custom_meal_name}.`}
          maxWidth="sm"
        >
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#56645A] dark:text-[#A3B5AA] mb-1">
                Number of Servings
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={editServingsValue}
                onChange={(e) => setEditServingsValue(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A] text-sm font-bold text-[#1D2420] dark:text-[#F2F5F3] text-center focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditingServingsPlan(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveServings}>
                Save Servings
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Week Shopping List Generation Explanation Modal */}
      {generationResult && (
        <Dialog
          isOpen={!!generationResult}
          onClose={() => setGenerationResult(null)}
          title="Weekly Shopping List Generated"
          description={`${generationResult.planned_meals_count} planned meals analyzed across ${formatShortDate(weekDays[0].date)} – ${formatShortDate(weekDays[6].date)}.`}
          maxWidth="2xl"
        >
          <div className="space-y-4 pt-1">
            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Successfully added or updated <strong>{generationResult.items_added_or_updated}</strong> ingredients in your Shopping List!
                </span>
              </div>
            </div>

            <div className="text-xs font-bold uppercase tracking-wider text-[#56645A] dark:text-[#A3B5AA] px-1">
              Pantry Deduction & Matching Breakdown
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {generationResult.explanations.map((exp, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border transition-all ${
                    exp.needs_review
                      ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/40 dark:bg-[#20180B]/40'
                      : exp.pantry_amount_found
                      ? 'border-[#E8E1D3] dark:border-[#23332A] bg-white dark:bg-[#152019]'
                      : 'border-[#E8E1D3] dark:border-[#23332A] bg-[#FAF7F2]/60 dark:bg-[#121B15]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div>
                      <span className="text-xs font-bold text-[#1D2420] dark:text-[#F2F5F3]">
                        {exp.ingredient_name}
                      </span>
                      <span className="text-xs text-[#87968B] ml-2">
                        Needed: <strong>{exp.total_needed} {exp.unit}</strong>
                      </span>
                    </div>

                    <div>
                      {exp.needs_review ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <AlertTriangle className="w-3 h-3" />
                          Unit Mismatch
                        </span>
                      ) : exp.pantry_amount_found ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Subtracted Accurately
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EDE6DC] dark:bg-[#202E24] text-[#56645A] dark:text-[#A3B5AA]">
                          No Stock in Pantry
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stock found info */}
                  {exp.pantry_amount_found && (
                    <div className="text-[11px] text-[#56645A] dark:text-[#A3B5AA] mb-1">
                      Pantry stock on hand: <strong>{exp.pantry_amount_found}</strong>
                    </div>
                  )}

                  {/* Detailed Plain Language Explanation */}
                  <p className="text-[11px] text-[#56645A] dark:text-[#A3B5AA] leading-relaxed">
                    {exp.explanation}
                  </p>

                  {/* Review warning if unit mismatch */}
                  {exp.review_warning && (
                    <div className="mt-2 p-2 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[10px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span>{exp.review_warning}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E8E1D3] dark:border-[#23332A]">
              <span className="text-xs text-[#87968B]">
                {generationResult.explanations.length} total ingredient types evaluated
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGenerationResult(null)}
                >
                  Close
                </Button>
                {onNavigateToShopping && (
                  <Button
                    variant="primary"
                    size="sm"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setGenerationResult(null);
                      onNavigateToShopping();
                    }}
                  >
                    View Shopping List
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

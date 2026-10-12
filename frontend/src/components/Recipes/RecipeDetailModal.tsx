import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Users,
  Flame,
  Check,
  AlertTriangle,
  ShoppingCart,
  ChefHat,
  Play,
  Pause,
  RotateCcw,
  Minus,
  Plus,
  Heart,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { RecipeMatch, CookRecipeResponse } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { RecipeArt } from '../illustrations/RecipeArt';

interface RecipeDetailModalProps {
  recipe: RecipeMatch | null;
  isOpen: boolean;
  onClose: () => void;
  onCookRecipe: (recipeId: number, servings: number) => Promise<CookRecipeResponse | null>;
  onAddMissingToGrocery: (recipeId: number) => Promise<void>;
  onToggleFavorite?: (recipeId: number) => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  isOpen,
  onClose,
  onCookRecipe,
  onAddMissingToGrocery,
  onToggleFavorite,
}) => {
  const [servings, setServings] = useState(2);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps'>('ingredients');
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [cookingLoading, setCookingLoading] = useState(false);
  const [cookResult, setCookResult] = useState<CookRecipeResponse | null>(null);
  const [imgError, setImgError] = useState(false);

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    if (recipe) {
      setServings(recipe.servings || 2);
      setCompletedSteps([]);
      setCookResult(null);
      setTimerRunning(false);
      setTimerSeconds((recipe.cook_time_minutes || 10) * 60);
      setImgError(false);
    }
  }, [recipe]);

  useEffect(() => {
    let interval: any = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  // Handle Escape key to close recipe detail modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !recipe) return null;

  const baseServings = recipe.servings > 0 ? recipe.servings : 1;
  const multiplier = servings / baseServings;
  const isFavorite = !!recipe.is_favorite;

  let steps: string[] = [];
  try {
    steps = JSON.parse(recipe.instructions);
    if (!Array.isArray(steps)) steps = [recipe.instructions];
  } catch {
    steps = recipe.instructions.split('\n').filter((s) => s.trim().length > 0);
  }

  const toggleStep = (idx: number) => {
    if (completedSteps.includes(idx)) {
      setCompletedSteps(completedSteps.filter((i) => i !== idx));
    } else {
      setCompletedSteps([...completedSteps, idx]);
    }
  };

  const handleCook = async () => {
    setCookingLoading(true);
    try {
      const res = await onCookRecipe(recipe.id, servings);
      if (res) {
        setCookResult(res);
      }
    } finally {
      setCookingLoading(false);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const renderReadinessBadge = () => {
    if (recipe.readiness_status === 'ready_to_cook') {
      return (
        <Badge variant="ready" size="sm" dot>
          Ready to Cook (Quantities Verified)
        </Badge>
      );
    }
    if (recipe.readiness_status === 'types_available') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-lg bg-[#EBF2EC]/95 dark:bg-[#1A2E21]/95 text-[#1C3B2B] dark:text-emerald-300 backdrop-blur-md shadow-sm border border-[#C8D9CB] dark:border-[#2B4734]">
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          All Ingredient Types Available
        </span>
      );
    }
    if (recipe.readiness_status === 'insufficient_quantity') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-lg bg-[#FAF0E4]/95 dark:bg-[#2D2115]/95 text-[#B46A1B] dark:text-[#F59E0B] backdrop-blur-md shadow-sm border border-[#F3DCBD] dark:border-[#4D351E]">
          Low Stock Quantity
        </span>
      );
    }
    return (
      <Badge variant="amber" size="sm">
        {recipe.match_percentage}% Match (Missing {recipe.missing_count})
      </Badge>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 dark:bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#FAF7F2] dark:bg-[#18221C] border border-[#E8E1D3] dark:border-[#23332A] rounded-3xl max-w-3xl w-full my-6 shadow-2xl overflow-hidden relative max-h-[92vh] flex flex-col text-left">
        {/* Modal Top Header with Artwork or Image */}
        <div className="relative h-56 sm:h-64 w-full shrink-0 bg-[#243329]">
          {!imgError && recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <RecipeArt
              title={recipe.title}
              cuisine={recipe.cuisine}
              mealType={recipe.meal_type}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />

          {/* Close & Favorite Top Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(recipe.id)}
                className={`p-2 rounded-full backdrop-blur-md transition-all ${
                  isFavorite
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'bg-black/50 hover:bg-black/80 text-white/80 hover:text-white'
                }`}
                title={isFavorite ? 'Remove from saved' : 'Save recipe'}
                aria-label="Save recipe"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Badges on Hero */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2 items-center">
            {renderReadinessBadge()}
            {(!recipe.source || recipe.source === 'sample') ? (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#1C3B2B]/90 text-[#85E0A3] border border-[#2D5A42] backdrop-blur-md shadow-sm">
                Kitchen Tested Sample
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-black/60 text-slate-200 backdrop-blur-md">
                User Recipe
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-black/60 text-white backdrop-blur-md">
              {recipe.cuisine}
            </span>
          </div>

          {/* Title & Metadata */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {recipe.title}
            </h2>
            <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs sm:text-sm text-slate-200">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-300" />
                Prep: {recipe.prep_time_minutes}m | Cook: {recipe.cook_time_minutes}m
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-teal-300" />
                {recipe.servings} Servings (scalable)
              </span>
              {recipe.calories_per_serving && (
                <span className="flex items-center gap-1.5" title="Culinary estimate">
                  <Flame className="w-4 h-4 text-amber-300" />
                  ~{recipe.calories_per_serving} kcal/serv
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {recipe.description && (
            <p className="text-xs sm:text-sm text-[#56645A] dark:text-[#A3B5AA] leading-relaxed italic border-l-2 border-[#1C3B2B] dark:border-emerald-500 pl-3">
              &ldquo;{recipe.description}&rdquo;
            </p>
          )}

          {/* Pantry-Match Explanation Section */}
          <div className="p-4 rounded-2xl bg-[#F4EFE6] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#1C3B2B] dark:text-emerald-400" />
                <span className="text-xs font-bold text-[#1D2420] dark:text-[#F2F5F3] uppercase tracking-wider">
                  Pantry Match Explanation
                </span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#E8E1D3] dark:bg-[#202E24] text-[#1D2420] dark:text-[#F2F5F3]">
                Base Match Score: {recipe.match_percentage}%
              </span>
            </div>

            <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] leading-relaxed">
              <strong>Calculation:</strong> {recipe.matched_ingredients_count} of {recipe.total_essential_ingredients} required ingredient types available in non-expired stock ({recipe.match_percentage}% base match).
            </p>

            {recipe.readiness_explanation && (
              <p className="text-xs text-[#1C3B2B] dark:text-emerald-300 font-medium bg-white/70 dark:bg-[#1A281E]/70 p-2.5 rounded-xl border border-[#E2DBD0] dark:border-[#2B3C30]">
                {recipe.readiness_explanation}
              </p>
            )}

            {/* Available vs Missing Chips */}
            <div className="pt-1 flex flex-wrap gap-2 text-xs">
              {recipe.available_ingredients && recipe.available_ingredients.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-[#1C3B2B] dark:text-emerald-400">Available:</span>
                  {recipe.available_ingredients.map((ing, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EBF2EC] dark:bg-[#182B1E] text-[#1C3B2B] dark:text-emerald-300 text-[11px] font-medium border border-[#C8D9CB] dark:border-[#2B4734]">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      {ing}
                    </span>
                  ))}
                </div>
              )}
              {recipe.missing_ingredients && recipe.missing_ingredients.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] font-bold text-[#B46A1B] dark:text-[#F59E0B]">Missing:</span>
                  {recipe.missing_ingredients.map((ing, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAF0E4] dark:bg-[#2D2115] text-[#B46A1B] dark:text-[#F59E0B] text-[11px] font-medium border border-[#F3DCBD] dark:border-[#4D351E]">
                      <AlertTriangle className="w-2.5 h-2.5 stroke-[2.5]" />
                      {ing}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Allergen & Food Safety Reminder Card */}
          <div className="p-3.5 rounded-2xl bg-[#FAF0E4]/60 dark:bg-[#20180F]/60 border border-[#F3DCBD] dark:border-[#382613] space-y-1.5 text-xs text-[#7A4B1A] dark:text-[#E0A868]">
            <div className="flex items-center gap-2 font-bold">
              <ShieldAlert className="w-4 h-4 text-[#B46A1B] dark:text-[#F59E0B] shrink-0" />
              <span>Allergen & Safety Notes</span>
            </div>
            <p>
              <strong>Known Stated Allergens:</strong> {recipe.allergens && recipe.allergens.trim() ? recipe.allergens : 'None reported in standard ingredient list'}.
            </p>
            <p className="text-[11px] text-[#87552A] dark:text-[#C2935E] leading-relaxed">
              Notice: Allergen notes are based on stated culinary ingredients; not a certified allergen-free kitchen or supply chain guarantee. Nutrition estimates are for general guidance. Always inspect ingredient packaging for allergens and freshness.
            </p>
          </div>

          {/* Cook Result Banner */}
          {cookResult && (
            <div className="p-4 rounded-2xl bg-[#EBF2EC] dark:bg-[#182B1E] border border-[#C8D9CB] dark:border-[#2B4734] text-[#1C3B2B] dark:text-emerald-300 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>{cookResult.message}</span>
              </div>
              <div className="mt-2 text-xs space-y-1">
                <p className="font-semibold text-[#56645A] dark:text-[#A3B5AA]">Deducted from Pantry:</p>
                {cookResult.deducted_items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[#56645A] dark:text-[#87968B]">
                    <span>• {item.name}: -{item.deducted_quantity} {item.unit}</span>
                    <span>{item.remaining_quantity} {item.unit} remaining</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Servings Scaler */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F4EFE6] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A]">
            <div>
              <span className="text-sm font-bold text-[#1D2420] dark:text-[#F2F5F3]">Adjust Servings</span>
              <p className="text-xs text-[#56645A] dark:text-[#A3B5AA]">
                Ingredient amounts scale dynamically with servings
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white dark:bg-[#1C2820] px-3 py-1.5 rounded-xl border border-[#E2DBD0] dark:border-[#2B3C30]">
              <button
                type="button"
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="p-1 rounded text-[#56645A] dark:text-[#A3B5AA] hover:text-[#1D2420] dark:hover:text-white transition-colors"
                title="Decrease servings"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-[#1C3B2B] dark:text-emerald-400 min-w-[3.5rem] text-center">
                {servings} {servings === 1 ? 'serving' : 'servings'}
              </span>
              <button
                type="button"
                onClick={() => setServings(servings + 1)}
                className="p-1 rounded text-[#56645A] dark:text-[#A3B5AA] hover:text-[#1D2420] dark:hover:text-white transition-colors"
                title="Increase servings"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs: Ingredients Checklist vs Step-by-Step Cook Mode */}
          <div className="flex border-b border-[#EAE3D6] dark:border-[#223026]">
            <button
              type="button"
              onClick={() => setActiveTab('ingredients')}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'ingredients'
                  ? 'border-[#1C3B2B] text-[#1C3B2B] dark:border-emerald-500 dark:text-emerald-400'
                  : 'border-transparent text-[#56645A] dark:text-[#A3B5AA] hover:text-[#1D2420]'
              }`}
            >
              Ingredients Checklist ({recipe.ingredient_details.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('steps')}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'steps'
                  ? 'border-[#1C3B2B] text-[#1C3B2B] dark:border-emerald-500 dark:text-emerald-400'
                  : 'border-transparent text-[#56645A] dark:text-[#A3B5AA] hover:text-[#1D2420]'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              Step-by-Step Cook Mode
            </button>
          </div>

          {/* TAB 1: Ingredients Checklist */}
          {activeTab === 'ingredients' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-[#56645A] dark:text-[#A3B5AA] uppercase tracking-wider">
                  Required Ingredients ({servings} servings)
                </span>
                {recipe.missing_count > 0 && (
                  <Button
                    variant="amber"
                    size="sm"
                    leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}
                    onClick={() => onAddMissingToGrocery(recipe.id)}
                  >
                    Add {recipe.missing_count} Missing to Grocery List
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {recipe.ingredient_details.map((ing, idx) => {
                  const scaledQty = Math.round(ing.required_quantity * multiplier * 10) / 10;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border transition-all gap-2 ${
                        ing.in_pantry
                          ? 'bg-white dark:bg-[#152019] border-[#E8E1D3] dark:border-[#23332A]'
                          : 'bg-[#FDF6EC] dark:bg-[#20180F] border-[#F3DCBD] dark:border-[#382613]'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                            ing.in_pantry
                              ? 'bg-[#EBF2EC] text-[#1C3B2B] dark:bg-[#1A2E21] dark:text-emerald-400'
                              : 'bg-[#FDF6EC] text-[#B46A1B] dark:bg-[#342410] dark:text-[#F59E0B]'
                          }`}
                        >
                          {ing.in_pantry ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${ing.in_pantry ? 'text-[#1D2420] dark:text-[#F2F5F3]' : 'text-[#7A4B1A] dark:text-[#F59E0B]'}`}>
                            {ing.ingredient_name}
                            {ing.is_optional && (
                              <span className="ml-1.5 text-[10px] text-[#87968B] font-normal">(optional)</span>
                            )}
                          </p>
                          <p className="text-xs text-[#56645A] dark:text-[#A3B5AA]">
                            Recipe requires: <strong className="text-[#1D2420] dark:text-white font-semibold">{scaledQty} {ing.unit}</strong>
                            {ing.in_pantry && ing.pantry_quantity !== null && (
                              <span className="ml-2 text-[#56735D] dark:text-[#8DB896]">
                                (In stock: {ing.pantry_quantity} {ing.pantry_unit})
                              </span>
                            )}
                          </p>
                          {ing.status_note && (
                            <p className="text-[11px] text-[#87968B] dark:text-[#7A8F80] mt-0.5">
                              {ing.status_note}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        {ing.is_expiring_soon && (
                          <Badge variant="amber" size="sm">
                            Expiring Soon
                          </Badge>
                        )}
                        {!ing.in_pantry && (
                          <Badge variant="rose" size="sm">
                            Missing
                          </Badge>
                        )}
                        {ing.in_pantry && ing.has_sufficient_quantity && (
                          <Badge variant="ready" size="sm">
                            Sufficient
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Cook Mode */}
          {activeTab === 'steps' && (
            <div className="space-y-5">
              {/* Kitchen Timer */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F4EFE6] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EBF2EC] dark:bg-[#1A2E21] text-[#1C3B2B] dark:text-emerald-400 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#56645A] dark:text-[#A3B5AA] uppercase tracking-wider block">
                      Kitchen Timer
                    </span>
                    <div className="text-2xl font-mono font-bold text-[#1D2420] dark:text-[#F2F5F3] tracking-wider">
                      {formatTimer(timerSeconds)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={timerRunning ? 'amber' : 'primary'}
                    size="sm"
                    leftIcon={timerRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    onClick={() => setTimerRunning(!timerRunning)}
                  >
                    {timerRunning ? 'Pause' : 'Start'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setTimerRunning(false);
                      setTimerSeconds((recipe.cook_time_minutes || 10) * 60);
                    }}
                    className="p-2 rounded-xl text-[#56645A] dark:text-[#A3B5AA] hover:bg-[#EAE3D6] dark:hover:bg-[#202E24] transition-colors"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Steps Checklist */}
              <div className="space-y-2.5">
                {steps.map((step, idx) => {
                  const done = completedSteps.includes(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleStep(idx)}
                      className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all duration-150 ${
                        done
                          ? 'bg-[#EBF2EC]/40 dark:bg-[#182B1E]/30 border-[#C8D9CB] dark:border-[#2B4734] opacity-75'
                          : 'bg-white dark:bg-[#152019] border-[#E8E1D3] dark:border-[#23332A] hover:border-[#1C3B2B]/40'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg mt-0.5 flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          done
                            ? 'bg-[#1C3B2B] text-white dark:bg-emerald-500 dark:text-[#062415]'
                            : 'bg-[#EDE6DC] text-[#56645A] dark:bg-[#202E24] dark:text-[#A3B5AA]'
                        }`}
                      >
                        {done ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                      </div>
                      <p className={`text-sm leading-relaxed ${done ? 'line-through text-[#87968B]' : 'text-[#1D2420] dark:text-[#F2F5F3]'}`}>
                        {step}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Sticky Bottom Action */}
        <div className="p-4 sm:p-5 border-t border-[#EAE3D6] dark:border-[#223026] bg-[#F4EFE6]/80 dark:bg-[#131B16]/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] text-center sm:text-left">
            Cooking will deduct scaled ingredient quantities from your real pantry inventory (earliest-expiry first).
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="outline" size="md" onClick={onClose} className="flex-1 sm:flex-initial">
              Close
            </Button>
            <Button
              variant="primary"
              size="md"
              isLoading={cookingLoading}
              leftIcon={<ChefHat className="w-4 h-4" />}
              onClick={handleCook}
              className="flex-1 sm:flex-initial"
            >
              I Made This (Deduct)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

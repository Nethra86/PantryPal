import React, { useState } from 'react';
import { Clock, Users, Flame, ShoppingCart, AlertCircle, Heart, Check } from 'lucide-react';
import { RecipeMatch } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { RecipeArt } from '../illustrations/RecipeArt';

interface RecipeCardProps {
  recipe: RecipeMatch;
  onSelect: (recipe: RecipeMatch) => void;
  onAddMissingToGrocery: (recipeId: number) => void;
  onToggleFavorite?: (recipeId: number) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onSelect,
  onAddMissingToGrocery,
  onToggleFavorite,
}) => {
  const [imgError, setImgError] = useState(false);
  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
  const isMissing = recipe.missing_count > 0;
  const isFavorite = !!recipe.is_favorite;

  // Render readiness badge adhering strictly to semantics
  const renderReadinessBadge = () => {
    if (recipe.readiness_status === 'ready_to_cook') {
      return (
        <Badge variant="ready" size="sm" dot>
          Ready to Cook
        </Badge>
      );
    }
    if (recipe.readiness_status === 'types_available') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-[#EBF2EC]/95 dark:bg-[#1A2E21]/95 text-[#1C3B2B] dark:text-emerald-300 backdrop-blur-md shadow-sm border border-[#C8D9CB] dark:border-[#2B4734]">
          <Check className="w-3 h-3 stroke-[2.5]" />
          All Types Available
        </span>
      );
    }
    if (recipe.readiness_status === 'insufficient_quantity') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-[#FAF0E4]/95 dark:bg-[#2D2115]/95 text-[#B46A1B] dark:text-[#F59E0B] backdrop-blur-md shadow-sm border border-[#F3DCBD] dark:border-[#4D351E]">
          Low Quantity
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-[#FAF7F2]/95 dark:bg-[#151F19]/95 text-[#B46A1B] dark:text-[#F59E0B] backdrop-blur-md shadow-sm border border-[#E8E1D3] dark:border-[#2E3F33]">
        {recipe.match_percentage}% Match
        <span className="text-[10px] text-[#7A4B1A] dark:text-[#D1974F] font-normal">
          (Missing {recipe.missing_count})
        </span>
      </span>
    );
  };

  return (
    <div
      data-testid="recipe-card"
      onClick={() => onSelect(recipe)}
      className="group rounded-2xl border border-[#E8E1D3] dark:border-[#23332A] bg-white dark:bg-[#18221C] shadow-[0_4px_16px_-4px_rgba(35,45,38,0.06)] dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.45)] hover:shadow-[0_8px_24px_-4px_rgba(35,45,38,0.12)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer text-left"
    >
      <div>
        {/* Visual Header */}
        <div className="relative h-44 w-full overflow-hidden bg-[#243329]">
          {!imgError && recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <RecipeArt
              title={recipe.title}
              cuisine={recipe.cuisine}
              mealType={recipe.meal_type}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

          {/* Top Left: Match & Readiness Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
            {renderReadinessBadge()}
            {(!recipe.source || recipe.source === 'sample') ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#1C3B2B]/90 text-[#85E0A3] border border-[#2D5A42] backdrop-blur-md shadow-sm">
                Kitchen Tested Sample
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/60 text-slate-200 backdrop-blur-md">
                User Recipe
              </span>
            )}
          </div>

          {/* Top Right: Favorite Button & Cuisine */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(recipe.id);
                }}
                className={`p-1.5 rounded-xl backdrop-blur-md transition-all ${
                  isFavorite
                    ? 'bg-rose-500/90 text-white shadow-sm'
                    : 'bg-black/50 hover:bg-black/80 text-white/80 hover:text-white'
                }`}
                title={isFavorite ? 'Remove from saved' : 'Save recipe'}
                aria-label="Save recipe"
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md">
              {recipe.cuisine}
            </span>
          </div>

          {/* Rescues Expiring Badge */}
          {recipe.rescues_expiring_count > 0 && (
            <div className="absolute bottom-2.5 left-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#B46A1B] text-white backdrop-blur-md shadow-sm">
                <AlertCircle className="w-3 h-3 stroke-[2.5]" />
                Rescues {recipe.rescues_expiring_count} perishable item{recipe.rescues_expiring_count > 1 ? 's' : ''}!
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#56735D] dark:text-[#8DB896]">
            <div className="flex items-center gap-2">
              <span>{recipe.meal_type}</span>
              <span>•</span>
              <span className="text-[#87968B]">{recipe.difficulty}</span>
            </div>
            {recipe.allergens && (
              <span className="text-[10px] font-normal normal-case text-[#87968B] dark:text-[#A3B5AA] truncate max-w-[140px]" title={`Allergens: ${recipe.allergens}`}>
                Allergens: {recipe.allergens}
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-[#1D2420] dark:text-[#F2F5F3] group-hover:text-[#1C3B2B] dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
            {recipe.title}
          </h3>

          <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] line-clamp-2 leading-relaxed">
            {recipe.description}
          </p>

          {/* Available / Missing Ingredients Snapshot */}
          <div className="pt-1 text-[11px] space-y-1 text-[#56645A] dark:text-[#A3B5AA]">
            {recipe.available_ingredients && recipe.available_ingredients.length > 0 && (
              <div className="flex items-center gap-1.5 truncate">
                <Check className="w-3 h-3 text-[#1C3B2B] dark:text-emerald-400 shrink-0" />
                <span className="truncate">
                  In stock: <strong className="text-[#1D2420] dark:text-white font-medium">{recipe.available_ingredients.slice(0, 3).join(', ')}{recipe.available_ingredients.length > 3 ? ` +${recipe.available_ingredients.length - 3} more` : ''}</strong>
                </span>
              </div>
            )}
            {recipe.missing_ingredients && recipe.missing_ingredients.length > 0 && (
              <div className="flex items-center gap-1.5 truncate text-[#B46A1B] dark:text-[#F59E0B]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B46A1B] dark:bg-[#F59E0B] shrink-0" />
                <span className="truncate">
                  Need: <strong>{recipe.missing_ingredients.slice(0, 2).join(', ')}{recipe.missing_ingredients.length > 2 ? ` +${recipe.missing_ingredients.length - 2}` : ''}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 pt-2 text-xs text-[#56645A] dark:text-[#87968B] border-t border-[#F2EDE4] dark:border-[#1F2C24]">
            <div className="flex items-center gap-1" title="Prep + Cook Time">
              <Clock className="w-3.5 h-3.5 text-[#87968B]" />
              <span>{totalTime}m ({recipe.cook_time_minutes}m cook)</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#87968B]" />
              <span>{recipe.servings} serv</span>
            </div>
            {recipe.calories_per_serving && (
              <div className="flex items-center gap-1" title="Estimated calories per serving">
                <Flame className="w-3.5 h-3.5 text-[#B46A1B]" />
                <span>{recipe.calories_per_serving} kcal</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="px-4 pb-4 pt-2 flex items-center gap-2 border-t border-[#F2EDE4] dark:border-[#1F2C24]">
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(recipe);
          }}
          className="flex-1"
        >
          View & Cook
        </Button>

        {isMissing && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddMissingToGrocery(recipe.id);
            }}
            title="Add missing items to grocery list"
            className="border-[#E2DBD0] text-[#B46A1B] dark:text-[#F59E0B]"
          >
            <ShoppingCart className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">+ Missing</span>
          </Button>
        )}
      </div>
    </div>
  );
};

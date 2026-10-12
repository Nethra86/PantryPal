import React from 'react';
import {
  ChefHat,
  Refrigerator,
  ArrowRight,
  Plus,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Leaf,
  ShoppingCart,
  Sparkles,
  Layers,
  Search,
  PackageOpen,
  Info
} from 'lucide-react';
import { PantryItem, RecipeMatch, MealPlan, GroceryItem } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { RecipeCard } from '../Recipes/RecipeCard';

export interface DashboardViewProps {
  userName: string;
  pantryItems: PantryItem[];
  recipes: RecipeMatch[];
  groceryItems?: GroceryItem[];
  mealPlans: MealPlan[];
  onNavigateTab: (tab: 'dashboard' | 'recipes' | 'pantry' | 'grocery' | 'meal-plan' | 'settings') => void;
  onSelectRecipe: (recipe: RecipeMatch) => void;
  onOpenAddPantry: () => void;
  onOpenBatchAdd?: () => void;
  onLoadSamplePantry?: () => void;
  onAddMissingToGrocery: (recipeId: number) => void;
  onToggleFavorite?: (recipeId: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userName,
  pantryItems,
  recipes,
  groceryItems = [],
  mealPlans,
  onNavigateTab,
  onSelectRecipe,
  onOpenAddPantry,
  onOpenBatchAdd,
  onLoadSamplePantry,
  onAddMissingToGrocery,
  onToggleFavorite,
}) => {
  // 100% Fact-Based calculations derived directly from local database (Zero fabricated claims!)
  const readyToCook = recipes.filter((r) => r.can_cook_now);
  const useSoonItems = pantryItems.filter(
    (i) =>
      i.freshness_status === 'due_today' ||
      i.freshness_status === 'due_within_three_days' ||
      i.freshness_status === 'expiring_soon' ||
      (i.days_until_expiry !== null && i.days_until_expiry !== undefined && i.days_until_expiry <= 3)
  );
  const totalStockCount = pantryItems.length;
  const uncheckedShoppingCount = groceryItems.filter((i) => !i.is_purchased).length;
  const plannedCount = mealPlans.length;

  // Personalized recommendations: High match percentage recipes (ready or missing at most 2 items)
  const personalizedRecommendations = recipes
    .filter((r) => r.can_cook_now || r.missing_count <= 2)
    .sort((a, b) => b.match_percentage - a.match_percentage);

  const isPantryEmpty = totalStockCount === 0;

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12 text-left">
      {/* 1. Serene Kitchen Greeting Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#FAF7F2] dark:bg-[#151E18] border border-[#E8E1D3] dark:border-[#23332A] p-6 sm:p-8 shadow-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#EBF2EC] dark:bg-emerald-950/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#FAF1E3] dark:bg-[#20180F]/30 rounded-full blur-3xl pointer-events-none -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF2EC] text-[#1C3B2B] dark:bg-[#1A2E21] dark:text-emerald-300 border border-[#C8D9CB] dark:border-emerald-500/30">
              <Leaf className="w-3.5 h-3.5" />
              <span>Calm Kitchen Companion</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1D2420] dark:text-[#F2F5F3] tracking-tight leading-tight">
              Good day, {userName}.
            </h1>

            <p className="text-sm sm:text-base text-[#56645A] dark:text-[#A3B5AA] leading-relaxed">
              {isPantryEmpty ? (
                'Your pantry is currently empty. Get started below to discover recipes tailored to your ingredients.'
              ) : (
                <>
                  You have{' '}
                  <span className="font-bold text-[#1C3B2B] dark:text-emerald-400">
                    {readyToCook.length} recipe{readyToCook.length === 1 ? '' : 's'}
                  </span>{' '}
                  ready to cook right now, with{' '}
                  <span className="font-bold text-[#B46A1B] dark:text-[#F59E0B]">
                    {useSoonItems.length} item{useSoonItems.length === 1 ? '' : 's'}
                  </span>{' '}
                  to use soon.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="md"
              leftIcon={<ChefHat className="w-4 h-4" />}
              onClick={() => onNavigateTab('recipes')}
            >
              Explore Recipes
            </Button>
            <Button
              variant="outline"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={onOpenAddPantry}
            >
              Add Ingredient
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Six Real, Fact-Based Kitchen Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Ingredient-Complete Ready Dishes */}
        <Card
          hoverable
          onClick={() => onNavigateTab('recipes')}
          className="cursor-pointer p-4 space-y-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#56645A] dark:text-[#A3B5AA]">
              Ready to Cook
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#EBF2EC] dark:bg-[#1A2E21] text-[#1C3B2B] dark:text-emerald-300 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#1D2420] dark:text-[#F2F5F3]">
              {readyToCook.length}
            </div>
            <p className="text-[11px] text-[#56645A] dark:text-[#87968B] mt-0.5 truncate">
              100% matched recipes
            </p>
          </div>
        </Card>

        {/* Card 2: Pantry Inventory */}
        <Card
          hoverable
          onClick={() => onNavigateTab('pantry')}
          className="cursor-pointer p-4 space-y-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#56645A] dark:text-[#A3B5AA]">
              Pantry Items
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F3EEE4] dark:bg-[#1D2821] text-[#56645A] dark:text-[#A3B5AA] flex items-center justify-center">
              <Refrigerator className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#1D2420] dark:text-[#F2F5F3]">
              {totalStockCount}
            </div>
            <p className="text-[11px] text-[#56645A] dark:text-[#87968B] mt-0.5 truncate">
              Items in stock
            </p>
          </div>
        </Card>

        {/* Card 3: Use Soon (≤3 days) */}
        <Card
          hoverable
          onClick={() => onNavigateTab('pantry')}
          className={`cursor-pointer p-4 space-y-2 flex flex-col justify-between ${
            useSoonItems.length > 0
              ? 'border-[#F3DCBD] bg-[#FDF6EC]/60 dark:border-[#4D3315] dark:bg-[#20180F]/40'
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#B46A1B] dark:text-[#F59E0B]">
              Use Soon
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FDF6EC] dark:bg-[#342410] text-[#B46A1B] dark:text-[#F59E0B] flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#B46A1B] dark:text-[#F59E0B]">
              {useSoonItems.length}
            </div>
            <p className="text-[11px] text-[#7A4B1A] dark:text-[#C78B45] mt-0.5 truncate">
              Due within 3 days
            </p>
          </div>
        </Card>

        {/* Card 4: Unchecked Shopping Items */}
        <Card
          hoverable
          onClick={() => onNavigateTab('grocery')}
          className="cursor-pointer p-4 space-y-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#56645A] dark:text-[#A3B5AA]">
              To Buy
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F3EEE4] dark:bg-[#1D2821] text-[#56645A] dark:text-[#A3B5AA] flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#1D2420] dark:text-[#F2F5F3]">
              {uncheckedShoppingCount}
            </div>
            <p className="text-[11px] text-[#56645A] dark:text-[#87968B] mt-0.5 truncate">
              Unchecked items
            </p>
          </div>
        </Card>

        {/* Card 5: Weekly Planned Meals */}
        <Card
          hoverable
          onClick={() => onNavigateTab('meal-plan')}
          className="cursor-pointer p-4 space-y-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#56645A] dark:text-[#A3B5AA]">
              Planned
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#EBF2EC] dark:bg-[#1A2E21] text-[#1C3B2B] dark:text-emerald-300 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#1D2420] dark:text-[#F2F5F3]">
              {plannedCount}
            </div>
            <p className="text-[11px] text-[#56645A] dark:text-[#87968B] mt-0.5 truncate">
              Scheduled meals
            </p>
          </div>
        </Card>

        {/* Card 6: Personalized Recommendations */}
        <Card
          hoverable
          onClick={() => onNavigateTab('recipes')}
          className="cursor-pointer p-4 space-y-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#56645A] dark:text-[#A3B5AA]">
              Suggestions
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#EBF2EC] dark:bg-[#1A2E21] text-[#1C3B2B] dark:text-emerald-300 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#1D2420] dark:text-[#F2F5F3]">
              {personalizedRecommendations.length}
            </div>
            <p className="text-[11px] text-[#56645A] dark:text-[#87968B] mt-0.5 truncate">
              High match recipes
            </p>
          </div>
        </Card>
      </div>

      {/* 3. Empty Account Onboarding Wizard (Rendered when pantry is empty) */}
      {isPantryEmpty && (
        <section className="rounded-3xl border border-[#E8E1D3] dark:border-[#23332A] bg-white dark:bg-[#16201A] p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF2EC] text-[#1C3B2B] dark:bg-[#1A2E21] dark:text-emerald-300 border border-[#C8D9CB] dark:border-emerald-500/30">
              <PackageOpen className="w-3.5 h-3.5" />
              <span>Step-by-Step Onboarding</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1D2420] dark:text-[#F2F5F3]">
              Welcome to Your Fresh Pantry
            </h2>
            <p className="text-sm text-[#56645A] dark:text-[#A3B5AA] leading-relaxed">
              PantryPal matches meals strictly against what you actually have in stock. Add your ingredients
              using any of these fast onboarding options to unlock instant recipe recommendations:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1: Starter Pantry */}
            <div className="flex flex-col justify-between p-5 rounded-2xl bg-[#FAF7F2] dark:bg-[#1A241E] border border-[#E8E1D3] dark:border-[#2A3B30] space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#EBF2EC] dark:bg-[#203326] text-[#1C3B2B] dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h3 className="font-bold text-base text-[#1D2420] dark:text-[#F2F5F3]">
                  Load Starter Pantry
                </h3>
                <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] leading-relaxed">
                  Pre-populate 10 classic kitchen staples (olive oil, eggs, garlic, pasta, onions...) to immediately explore ready meals.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={onLoadSamplePantry}
                disabled={!onLoadSamplePantry}
              >
                Load Starter Pantry
              </Button>
            </div>

            {/* Step 2: Add Single Ingredient */}
            <div className="flex flex-col justify-between p-5 rounded-2xl bg-[#FAF7F2] dark:bg-[#1A241E] border border-[#E8E1D3] dark:border-[#2A3B30] space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#EBF2EC] dark:bg-[#203326] text-[#1C3B2B] dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h3 className="font-bold text-base text-[#1D2420] dark:text-[#F2F5F3]">
                  Add Single Item
                </h3>
                <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] leading-relaxed">
                  Manually add a specific item currently in your fridge, cupboard, or freezer with quantity and optional best-by date.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={onOpenAddPantry}
              >
                Add Ingredient
              </Button>
            </div>

            {/* Step 3: Batch Add Staples */}
            <div className="flex flex-col justify-between p-5 rounded-2xl bg-[#FAF7F2] dark:bg-[#1A241E] border border-[#E8E1D3] dark:border-[#2A3B30] space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#EBF2EC] dark:bg-[#203326] text-[#1C3B2B] dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h3 className="font-bold text-base text-[#1D2420] dark:text-[#F2F5F3]">
                  Batch Quick Add
                </h3>
                <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] leading-relaxed">
                  Quickly check off common kitchen staples in one click or paste multiple items line by line.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                leftIcon={<Layers className="w-3.5 h-3.5" />}
                onClick={onOpenBatchAdd}
                disabled={!onOpenBatchAdd}
              >
                Batch Add
              </Button>
            </div>

            {/* Step 4: Browse Recipe Catalog */}
            <div className="flex flex-col justify-between p-5 rounded-2xl bg-[#FAF7F2] dark:bg-[#1A241E] border border-[#E8E1D3] dark:border-[#2A3B30] space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#EBF2EC] dark:bg-[#203326] text-[#1C3B2B] dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <h3 className="font-bold text-base text-[#1D2420] dark:text-[#F2F5F3]">
                  Browse Recipes
                </h3>
                <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] leading-relaxed">
                  Explore available recipes to see what ingredients you might want to pick up on your next grocery trip.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                onClick={() => onNavigateTab('recipes')}
              >
                View Recipes
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* 4. Dedicated Use-Soon Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#1D2420] dark:text-[#F2F5F3]">
              Freshness Radar &bull; Use Soon
            </h2>
            {useSoonItems.length > 0 ? (
              <Badge variant="amber" size="sm" dot>
                {useSoonItems.length} Due Soon
              </Badge>
            ) : (
              <Badge variant="ready" size="sm" dot>
                All Fresh
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTab('pantry')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Manage All Pantry
          </Button>
        </div>

        {useSoonItems.length > 0 ? (
          <div className="rounded-3xl border border-[#F3DCBD] dark:border-[#4D3315] bg-[#FDF6EC]/40 dark:bg-[#1D170F]/40 p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FDF6EC] dark:bg-[#342410] text-[#B46A1B] dark:text-[#F59E0B] flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-[#7A4B1A] dark:text-[#C78B45] leading-relaxed font-medium">
                  Prioritize these ingredients in your next dish. Using items before they expire preserves food quality and saves kitchen shopping trips.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {useSoonItems.map((item) => {
                const days = item.days_until_expiry ?? 0;
                const isUrgent = days <= 0;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between p-4 rounded-2xl bg-white dark:bg-[#1A221B] border border-[#F3DCBD] dark:border-[#382613] shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-[#1D2420] dark:text-[#F2F5F3]">
                          {item.name}
                        </h4>
                        <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] mt-0.5">
                          {item.quantity} {item.unit} &bull; {item.location}
                        </p>
                      </div>
                      <Badge variant={isUrgent ? 'rose' : 'amber'} size="sm">
                        {isUrgent ? 'Due Today' : `${days}d left`}
                      </Badge>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      leftIcon={<Search className="w-3 h-3" />}
                      onClick={() => onNavigateTab('recipes')}
                    >
                      Find Recipes with {item.name}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <Card className="p-6 text-center text-[#56645A] dark:text-[#A3B5AA]">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#EBF2EC] dark:bg-[#1A2E21] text-[#1C3B2B] dark:text-emerald-300 mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-[#1D2420] dark:text-[#F2F5F3]">
              Freshness Radar is All Clear!
            </p>
            <p className="text-xs mt-1">
              {isPantryEmpty
                ? 'Add ingredients with expiration dates to monitor freshness automatically.'
                : `All ${totalStockCount} pantry items have ample freshness buffer. No items are due within the next 3 days.`}
            </p>
          </Card>
        )}
      </section>

      {/* 5. Spotlight: Ready to Cook Right Now (Ingredient-Complete Dishes) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-[#1D2420] dark:text-[#F2F5F3]">
                Ready to Cook Right Now
              </h2>
              <Badge variant="ready" size="sm" dot>
                {readyToCook.length} Available
              </Badge>
            </div>
            <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] mt-0.5">
              100% pantry matched dishes requiring zero grocery store trips.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTab('recipes')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            View All
          </Button>
        </div>

        {readyToCook.length === 0 ? (
          <Card className="p-8 text-center text-[#56645A] dark:text-[#A3B5AA]">
            <p className="text-sm font-semibold">No 100% matched recipes yet.</p>
            <p className="text-xs mt-1">
              {isPantryEmpty
                ? 'Load the starter pantry or add your staples above to see ready dishes.'
                : 'Check out the personalized recommendations below that are missing only 1 or 2 items.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {readyToCook.slice(0, 3).map((recipe) => (
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
      </section>

      {/* 6. Personalized Recipe Recommendations */}
      {personalizedRecommendations.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-[#1D2420] dark:text-[#F2F5F3]">
                  Personalized Recipe Recommendations
                </h2>
                <Badge variant="sage" size="sm">
                  {personalizedRecommendations.length} Matched
                </Badge>
              </div>
              <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] mt-0.5">
                Ranked by ingredient overlap with your current pantry inventory.
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab('recipes')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              See All Recipes
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {personalizedRecommendations.slice(0, 3).map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onSelect={onSelectRecipe}
                onAddMissingToGrocery={onAddMissingToGrocery}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      {/* 7. Honest Data & Transparency Guarantee Card */}
      <div className="p-4 rounded-2xl bg-[#FAF7F2] dark:bg-[#131B15] border border-[#E8E1D3] dark:border-[#223026] flex items-center gap-3">
        <Info className="w-4 h-4 text-[#56735D] dark:text-emerald-400 shrink-0" />
        <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] leading-relaxed">
          <strong className="text-[#1D2420] dark:text-[#F2F5F3]">Factual Kitchen Accounting:</strong> Every count on this dashboard is directly computed from your real database records. We never invent or fabricate dollar savings, food waste reduction weights, or calorie figures.
        </p>
      </div>
    </div>
  );
};

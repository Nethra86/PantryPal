import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import {
  PantryItem,
  RecipeMatch,
  GroceryItem,
  MealPlan,
  Stats,
  CookRecipeResponse,
  MovePurchasedItemIn,
  GenerateWeekShoppingResponse,
} from './types';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { ToastContainer, ToastMessage } from './components/Toast';
import { DashboardView } from './components/dashboard/DashboardView';
import { PantryView } from './components/Pantry/PantryView';
import { AddPantryModal } from './components/Pantry/AddPantryModal';
import { BatchAddModal } from './components/Pantry/BatchAddModal';
import { RecipeExploreView } from './components/Recipes/RecipeExploreView';
import { RecipeDetailModal } from './components/Recipes/RecipeDetailModal';
import { CreateRecipeModal } from './components/Recipes/CreateRecipeModal';
import { GroceryView } from './components/Grocery/GroceryView';
import { MealPlannerView } from './components/MealPlanner/MealPlannerView';
import { SettingsView } from './components/settings/SettingsView';
import { AuthModal } from './components/auth/AuthModal';
import { Button } from './components/ui/Button';
import { AlertCircle } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'recipes' | 'pantry' | 'grocery' | 'meal-plan' | 'settings'
  >('dashboard');
  const [loading, setLoading] = useState(true);

  // Theme state: 'light' | 'dark' | 'system'
  const [themePreference, setThemePreference] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('pantrypal_theme_pref');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('pantrypal_theme');
    return saved !== null ? saved === 'dark' : false;
  });

  const applyTheme = (pref: 'light' | 'dark' | 'system') => {
    let dark = false;
    if (pref === 'dark') {
      dark = true;
    } else if (pref === 'light') {
      dark = false;
    } else {
      dark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    applyTheme(themePreference);
    localStorage.setItem('pantrypal_theme_pref', themePreference);
    localStorage.setItem('pantrypal_theme', isDark ? 'dark' : 'light');

    if (themePreference === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      mql.addEventListener('change', listener);
      return () => mql.removeEventListener('change', listener);
    }
  }, [themePreference, isDark]);

  const handleThemePreferenceChange = async (pref: 'light' | 'dark' | 'system') => {
    setThemePreference(pref);
    applyTheme(pref);
    try {
      await api.updateProfile({ theme_preference: pref });
    } catch {
      // local state already persisted
    }
  };

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    handleThemePreferenceChange(next);
  };

  // User state
  const [user, setUser] = useState<{
    id?: number;
    name: string;
    email: string;
    theme_preference?: 'light' | 'dark' | 'system';
    dietary_preferences?: string;
    preferred_unit?: 'metric' | 'imperial';
  }>({
    name: 'Chef Rowan',
    email: 'rowan@kitchen.local',
  });
  const [_isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Global search query
  const [searchQuery, setSearchQuery] = useState('');

  // Core Data
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [recipes, setRecipes] = useState<RecipeMatch[]>([]);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [_stats, setStats] = useState<Stats | null>(null);

  // Modals
  const [addPantryOpen, setAddPantryOpen] = useState(false);
  const [editPantryItem, setEditPantryItem] = useState<PantryItem | null>(null);
  const [batchAddOpen, setBatchAddOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeMatch | null>(null);
  const [createRecipeOpen, setCreateRecipeOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'warning' | 'error' | 'info', message: string) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial Fetch scoped to current authenticated user
  const loadData = async () => {
    try {
      setBackendError(null);
      const [pantry, matchedRecipes, grocery, plans, currentStats] = await Promise.all([
        api.getPantryItems(),
        api.getMatchedRecipes(),
        api.getGroceryItems(),
        api.getMealPlans(),
        api.getStats(),
      ]);

      setPantryItems(pantry);
      setRecipes(matchedRecipes);
      setGroceryItems(grocery);
      setMealPlans(plans);
      setStats(currentStats);
    } catch (err: any) {
      setBackendError(err.message || 'Unable to connect to kitchen backend');
      addToast('error', `Failed to load kitchen data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Auth Initialization on App Mount
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        const me = await api.getMe();
        setUser({
          id: me.user.id,
          name: me.user.name,
          email: me.user.email,
          theme_preference: me.user.theme_preference,
          dietary_preferences: me.user.dietary_preferences,
          preferred_unit: me.user.preferred_unit,
        });
        if (me.user.theme_preference) {
          setThemePreference(me.user.theme_preference);
        }
        setIsAuthenticated(true);
        await loadData();
      } catch {
        // Attempt quick sign-in with default seeded user if no active session
        try {
          const auto = await api.login({ email: 'rowan@kitchen.local', password: 'Password123!' });
          setUser({
            id: auto.user.id,
            name: auto.user.name,
            email: auto.user.email,
            theme_preference: auto.user.theme_preference,
            dietary_preferences: auto.user.dietary_preferences,
            preferred_unit: auto.user.preferred_unit,
          });
          if (auto.user.theme_preference) {
            setThemePreference(auto.user.theme_preference);
          }
          setIsAuthenticated(true);
          await loadData();
        } catch {
          setIsAuthenticated(false);
          setLoading(false);
          setAuthModalOpen(true);
        }
      }
    };
    checkAuthAndLoad();
  }, []);

  const handleAuthenticated = async (loggedInUser: { id: number; name: string; email: string }) => {
    setUser((prev) => ({ ...prev, ...loggedInUser }));
    setIsAuthenticated(true);
    setAuthModalOpen(false);
    addToast('success', `Welcome back, ${loggedInUser.name}!`);
    setLoading(true);
    await loadData();
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser({ name: 'Guest Cook', email: 'guest@pantrypal.local' });
      setIsAuthenticated(false);
      setPantryItems([]);
      setRecipes([]);
      setGroceryItems([]);
      setMealPlans([]);
      setStats(null);
      addToast('info', 'You have been signed out.');
      setAuthModalOpen(true);
    } catch (err: any) {
      addToast('error', `Logout failed: ${err.message}`);
    }
  };


  // --- Pantry Handlers ---
  const handleAddOrEditPantry = async (itemData: Partial<PantryItem>) => {
    try {
      if (editPantryItem) {
        await api.updatePantryItem(editPantryItem.id, itemData);
        addToast('success', `Updated "${itemData.name}"`);
      } else {
        await api.addPantryItem(itemData);
        addToast('success', `Added "${itemData.name}" to kitchen stock.`);
      }
      setEditPantryItem(null);
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleUpdateQuantity = async (id: number, delta: number) => {
    const item = pantryItems.find((i) => i.id === id);
    if (!item) return;
    const newQty = Math.max(0, Math.round((item.quantity + delta) * 10) / 10);
    try {
      await api.updatePantryItem(id, { quantity: newQty });
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleDeletePantryItem = async (id: number) => {
    try {
      await api.deletePantryItem(id);
      addToast('info', 'Ingredient removed from pantry.');
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleBatchAdd = async (items: Partial<PantryItem>[]) => {
    try {
      const res = await api.batchAddPantry(items);
      addToast('success', `Imported ${res.length} items to pantry stock!`);
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleLoadSamplePantry = async () => {
    try {
      const res = await api.loadSamplePantry();
      addToast(res.added_count > 0 ? 'success' : 'info', res.message);
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  // --- Recipe Handlers ---
  const handleCookRecipe = async (
    recipeId: number,
    servings: number
  ): Promise<CookRecipeResponse | null> => {
    try {
      const res = await api.cookRecipe(recipeId, servings);
      addToast('success', `Bon Appétit! Deducted ingredients for ${servings} serving(s).`);
      await loadData();
      return res;
    } catch (err: any) {
      addToast('error', err.message);
      return null;
    }
  };

  const handleAddMissingToGrocery = async (recipeId: number) => {
    try {
      const added = await api.addMissingFromRecipe(recipeId);
      if (added.length === 0) {
        addToast('info', 'All required ingredients are already in your pantry or shopping list!');
      } else {
        addToast('success', `Added ${added.length} missing ingredient(s) to your Shopping List!`);
      }
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleCreateRecipe = async (recipeData: any) => {
    try {
      await api.createRecipe(recipeData);
      addToast('success', `Recipe "${recipeData.title}" created successfully!`);
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleToggleFavorite = async (recipeId: number) => {
    const target = recipes.find((r) => r.id === recipeId);
    if (!target) return;
    const nextState = !target.is_favorite;

    // Optimistic UI update
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, is_favorite: nextState } : r))
    );
    if (selectedRecipe && selectedRecipe.id === recipeId) {
      setSelectedRecipe({ ...selectedRecipe, is_favorite: nextState });
    }

    try {
      if (nextState) {
        await api.addFavorite(recipeId);
        addToast('success', `Saved "${target.title}" to favorites!`);
      } else {
        await api.removeFavorite(recipeId);
        addToast('info', `Removed "${target.title}" from saved.`);
      }
    } catch (err: any) {
      // Rollback on error
      setRecipes((prev) =>
        prev.map((r) => (r.id === recipeId ? { ...r, is_favorite: !nextState } : r))
      );
      addToast('error', `Failed to update favorite: ${err.message}`);
    }
  };

  // --- Grocery Handlers ---
  const handleToggleGrocery = async (id: number) => {
    try {
      await api.toggleGroceryItem(id);
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleAddGrocery = async (item: Partial<GroceryItem>) => {
    try {
      await api.addGroceryItem(item);
      addToast('success', `Added "${item.name}" to shopping list.`);
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleDeleteGrocery = async (id: number) => {
    try {
      await api.deleteGroceryItem(id);
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleMovePurchasedToPantry = async () => {
    try {
      const res = await api.movePurchasedToPantry();
      await loadData();
      addToast('success', res.message);
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleClearPurchasedGrocery = async () => {
    try {
      const res = await api.clearPurchasedGrocery();
      await loadData();
      addToast('info', res.message);
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleEditGrocery = async (id: number, item: Partial<GroceryItem>) => {
    try {
      await api.updateGroceryItem(id, item);
      await loadData();
      addToast('success', `Updated "${item.name || 'item'}"`);
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleMovePurchasedToPantryExplicit = async (items: MovePurchasedItemIn[]) => {
    try {
      const res = await api.movePurchasedToPantryExplicit(items);
      await loadData();
      addToast('success', res.message);
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  // --- Meal Plan Handlers ---
  const handleAssignMeal = async (payload: {
    plan_date: string;
    day_of_week: string;
    meal_slot: string;
    recipe_id?: number | null;
    custom_meal_name?: string | null;
    planned_servings: number;
    notes?: string | null;
    replace_existing?: boolean;
  }) => {
    try {
      await api.assignMealPlan(payload);
      addToast(
        'success',
        payload.replace_existing
          ? `Replaced dish for ${payload.day_of_week} ${payload.meal_slot}!`
          : `Assigned dish to ${payload.day_of_week} ${payload.meal_slot}!`
      );
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
      throw err;
    }
  };

  const handleUpdateMealPlan = async (
    planId: number,
    payload: {
      planned_servings?: number;
      custom_meal_name?: string | null;
      notes?: string | null;
    }
  ) => {
    try {
      await api.updateMealPlan(planId, payload);
      addToast('success', 'Updated meal plan details.');
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleRemoveMeal = async (planId: number) => {
    try {
      await api.deleteMealPlan(planId);
      addToast('info', 'Meal removed from schedule.');
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleGenerateWeekShopping = async (
    startDate: string,
    endDate: string
  ): Promise<GenerateWeekShoppingResponse | null> => {
    try {
      const res = await api.generateShoppingListForWeek(startDate, endDate);
      addToast('success', res.message);
      await loadData();
      return res;
    } catch (err: any) {
      addToast('error', err.message);
      return null;
    }
  };

  // Metric counts
  const expiringCount = pantryItems.filter((i) => i.freshness_status === 'expiring_soon').length;
  const readyRecipeCount = recipes.filter((r) => r.can_cook_now).length;
  const unpurchasedGroceryCount = groceryItems.filter((i) => !i.is_purchased).length;

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#0E1410] text-[#1D2420] dark:text-[#F2F5F3] flex transition-colors duration-200">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Desktop Persistent Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pantryCount={pantryItems.length}
        expiringCount={expiringCount}
        readyRecipeCount={readyRecipeCount}
        unpurchasedGroceryCount={unpurchasedGroceryCount}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        userName={user.name}
        userEmail={user.email}
      />


      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Compact Header */}
        <Header
          onOpenAddPantry={() => {
            setEditPantryItem(null);
            setAddPantryOpen(true);
          }}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          expiringCount={expiringCount}
        />

        {/* Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12 text-left">
          {/* Backend Connection Notice & Retry Action */}
          {backendError && (
            <div className="mb-6 p-4 rounded-2xl bg-[#FDF6EC] dark:bg-[#20180F] border border-[#F3DCBD] dark:border-[#4D3315] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#F8E7D1] dark:bg-[#342410] text-[#B46A1B] dark:text-[#F59E0B] flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1D2420] dark:text-[#F2F5F3]">
                    Kitchen Backend Connection Required
                  </p>
                  <p className="text-xs text-[#7A4B1A] dark:text-[#C78B45]">
                    {backendError}. Some features require the running FastAPI backend server (http://127.0.0.1:8000).
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  setLoading(true);
                  loadData();
                }}
              >
                Retry Connection
              </Button>
            </div>
          )}

          {loading ? (
            <div className="space-y-6 pt-4 animate-pulse">
              {/* Header Skeleton */}
              <div className="h-44 bg-[#EDE6DC] dark:bg-[#1E2B21] rounded-3xl" />
              {/* Metrics Grid Skeleton */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-28 bg-[#EDE6DC] dark:bg-[#1E2B21] rounded-2xl" />
                ))}
              </div>
              {/* Recipe Cards Skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
                <div className="h-72 bg-[#EDE6DC] dark:bg-[#1E2B21] rounded-3xl" />
                <div className="h-72 bg-[#EDE6DC] dark:bg-[#1E2B21] rounded-3xl" />
                <div className="h-72 bg-[#EDE6DC] dark:bg-[#1E2B21] rounded-3xl" />
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  userName={user.name}
                  pantryItems={pantryItems}
                  recipes={recipes}
                  groceryItems={groceryItems}
                  mealPlans={mealPlans}
                  onNavigateTab={setActiveTab}
                  onSelectRecipe={(r) => setSelectedRecipe(r)}
                  onOpenAddPantry={() => {
                    setEditPantryItem(null);
                    setAddPantryOpen(true);
                  }}
                  onOpenBatchAdd={() => setBatchAddOpen(true)}
                  onLoadSamplePantry={handleLoadSamplePantry}
                  onAddMissingToGrocery={handleAddMissingToGrocery}
                  onToggleFavorite={handleToggleFavorite}
                />
              )}

              {activeTab === 'recipes' && (
                <RecipeExploreView
                  recipes={recipes}
                  onSelectRecipe={(r) => setSelectedRecipe(r)}
                  onAddMissingToGrocery={handleAddMissingToGrocery}
                  onOpenCreateRecipe={() => setCreateRecipeOpen(true)}
                  onToggleFavorite={handleToggleFavorite}
                />
              )}

              {activeTab === 'pantry' && (
                <PantryView
                  items={pantryItems}
                  onAddItem={() => {
                    setEditPantryItem(null);
                    setAddPantryOpen(true);
                  }}
                  onBatchAdd={() => setBatchAddOpen(true)}
                  onUpdateQuantity={handleUpdateQuantity}
                  onDeleteItem={handleDeletePantryItem}
                  onEditItem={(item) => {
                    setEditPantryItem(item);
                    setAddPantryOpen(true);
                  }}
                  onLoadSamplePantry={handleLoadSamplePantry}
                />
              )}

              {activeTab === 'grocery' && (
                <GroceryView
                  items={groceryItems}
                  onToggleItem={handleToggleGrocery}
                  onDeleteItem={handleDeleteGrocery}
                  onAddItem={handleAddGrocery}
                  onEditItem={handleEditGrocery}
                  onMoveToPantry={handleMovePurchasedToPantry}
                  onMoveToPantryExplicit={handleMovePurchasedToPantryExplicit}
                  onClearPurchased={handleClearPurchasedGrocery}
                  onShowToast={addToast}
                />
              )}

              {activeTab === 'meal-plan' && (
                <MealPlannerView
                  mealPlans={mealPlans}
                  recipes={recipes}
                  onAssignMeal={handleAssignMeal}
                  onUpdateMealPlan={handleUpdateMealPlan}
                  onRemoveMeal={handleRemoveMeal}
                  onGenerateWeekShopping={handleGenerateWeekShopping}
                  onSelectRecipe={(r) => setSelectedRecipe(r)}
                  onNavigateToShopping={() => setActiveTab('grocery')}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  user={user}
                  onUpdateUser={(updated) => setUser((prev) => ({ ...prev, ...updated }))}
                  themePreference={themePreference}
                  onChangeThemePreference={handleThemePreferenceChange}
                  pantryItems={pantryItems}
                  onResetData={handleLoadSamplePantry}
                  onShowToast={addToast}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* App-style Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        expiringCount={expiringCount}
        unpurchasedGroceryCount={unpurchasedGroceryCount}
      />

      {/* Modals */}
      <AddPantryModal
        isOpen={addPantryOpen}
        onClose={() => {
          setAddPantryOpen(false);
          setEditPantryItem(null);
        }}
        onAdd={handleAddOrEditPantry}
        editItem={editPantryItem}
      />

      <BatchAddModal
        isOpen={batchAddOpen}
        onClose={() => setBatchAddOpen(false)}
        onBatchAdd={handleBatchAdd}
      />

      <RecipeDetailModal
        recipe={selectedRecipe}
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onCookRecipe={handleCookRecipe}
        onAddMissingToGrocery={handleAddMissingToGrocery}
        onToggleFavorite={handleToggleFavorite}
      />

      <CreateRecipeModal
        isOpen={createRecipeOpen}
        onClose={() => setCreateRecipeOpen(false)}
        onCreate={handleCreateRecipe}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
}

export default App;


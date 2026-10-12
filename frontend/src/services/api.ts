import {
  PantryItem,
  RecipeMatch,
  GroceryItem,
  MealPlan,
  Stats,
  CookRecipeResponse
} from '../types';

const API_BASE = '/api';

// In-memory CSRF token store (tokens are NOT stored in localStorage)
let memoryCsrfToken: string | null = null;

export function setMemoryCsrfToken(token: string | null) {
  memoryCsrfToken = token;
}

export function getCsrfToken(): string | null {
  if (memoryCsrfToken) return memoryCsrfToken;
  // Fallback to client-readable CSRF cookie if present
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)pantrypal_csrf=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  theme_preference?: 'light' | 'dark' | 'system';
  dietary_preferences?: string;
  preferred_unit?: 'metric' | 'imperial';
  created_at: string;
}

export interface UserProfileUpdateRequest {
  name?: string;
  email?: string;
  current_password?: string;
  new_password?: string;
  theme_preference?: 'light' | 'dark' | 'system';
  dietary_preferences?: string;
  preferred_unit?: 'metric' | 'imperial';
}

export interface UserDataExport {
  export_version: string;
  exported_at: string;
  user: UserProfile;
  pantry_items: PantryItem[];
  shopping_items: GroceryItem[];
  meal_plans: MealPlan[];
  favorites: any[];
  summary: {
    total_pantry_items: number;
    total_shopping_items: number;
    total_meal_plans: number;
    total_favorites: number;
  };
}

export interface AuthResponse {
  user: UserProfile;
  csrf_token: string;
  message: string;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  // Attach CSRF token on state-changing requests
  const csrf = getCsrfToken();
  if (csrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers['X-CSRF-Token'] = csrf;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    credentials: 'include', // Ensures HttpOnly session cookies are transmitted
    headers,
  });

  if (!response.ok) {
    let errorMsg = `API Error ${response.status}: ${response.statusText}`;
    try {
      const err = await response.json();
      if (err.detail) {
        errorMsg = err.detail;
      } else if (err.errors && Array.isArray(err.errors)) {
        errorMsg = err.errors.join(', ');
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();

  // If response contains csrf_token, keep it in memory
  if (data && typeof data === 'object' && 'csrf_token' in data && typeof data.csrf_token === 'string') {
    setMemoryCsrfToken(data.csrf_token);
  }

  return data;
}

export const api = {
  // Authentication & Session
  register: async (credentials: { name: string; email: string; password: string }): Promise<AuthResponse> => {
    const res = await fetchJson<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setMemoryCsrfToken(res.csrf_token);
    return res;
  },

  login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    const res = await fetchJson<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setMemoryCsrfToken(res.csrf_token);
    return res;
  },

  logout: async (): Promise<{ message: string }> => {
    const res = await fetchJson<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
    setMemoryCsrfToken(null);
    return res;
  },

  getMe: async (): Promise<AuthResponse> => {
    const res = await fetchJson<AuthResponse>('/auth/me');
    setMemoryCsrfToken(res.csrf_token);
    return res;
  },

  // Pantry
  getPantryItems: async (params?: { category?: string; location?: string; search?: string; status?: string; sort_by?: string }) => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'All') query.append('category', params.category);
    if (params?.location && params.location !== 'All') query.append('location', params.location);
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'All') query.append('status', params.status);
    if (params?.sort_by) query.append('sort_by', params.sort_by);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<PantryItem[]>(`/pantry${qs}`);
  },

  addPantryItem: async (item: Partial<PantryItem>) => {
    return fetchJson<PantryItem>('/pantry', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  updatePantryItem: async (id: number, item: Partial<PantryItem>) => {
    return fetchJson<PantryItem>(`/pantry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  },

  deletePantryItem: async (id: number) => {
    return fetchJson<void>(`/pantry/${id}`, {
      method: 'DELETE',
    });
  },

  batchAddPantry: async (items: Partial<PantryItem>[]) => {
    return fetchJson<PantryItem[]>('/pantry/batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  loadSamplePantry: async () => {
    return fetchJson<{ message: string; added_count: number; items: PantryItem[] }>('/pantry/sample', {
      method: 'POST',
    });
  },

  // Recipes & Matching Engine
  getMatchedRecipes: async (params?: {
    min_match?: number;
    dietary_tag?: string;
    meal_type?: string;
    max_time?: number;
    search?: string;
    sort_by?: string;
    include_expired?: boolean;
    only_saved?: boolean;
    near_match?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.min_match !== undefined) query.append('min_match', params.min_match.toString());
    if (params?.dietary_tag && params.dietary_tag !== 'All') query.append('dietary_tag', params.dietary_tag);
    if (params?.meal_type && params.meal_type !== 'All') query.append('meal_type', params.meal_type);
    if (params?.max_time) query.append('max_time', params.max_time.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.sort_by) query.append('sort_by', params.sort_by);
    if (params?.include_expired !== undefined) query.append('include_expired', params.include_expired.toString());
    if (params?.only_saved) query.append('only_saved', 'true');
    if (params?.near_match && params.near_match !== 'all') query.append('near_match', params.near_match);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<RecipeMatch[]>(`/recipes/match${qs}`);
  },

  getRecipeById: async (id: number) => {
    return fetchJson<RecipeMatch>(`/recipes/${id}`);
  },

  createRecipe: async (recipe: any) => {
    return fetchJson<RecipeMatch>('/recipes', {
      method: 'POST',
      body: JSON.stringify(recipe),
    });
  },

  cookRecipe: async (recipeId: number, servings?: number) => {
    return fetchJson<CookRecipeResponse>(`/recipes/${recipeId}/cook`, {
      method: 'POST',
      body: JSON.stringify({ servings }),
    });
  },

  // Favorites
  addFavorite: async (recipeId: number) => {
    return fetchJson<{ message: string }>(`/recipes/${recipeId}/favorite`, {
      method: 'POST',
    });
  },

  removeFavorite: async (recipeId: number) => {
    return fetchJson<void>(`/recipes/${recipeId}/favorite`, {
      method: 'DELETE',
    });
  },

  // Grocery & Shopping
  getGroceryItems: async () => {
    return fetchJson<GroceryItem[]>('/grocery');
  },

  addGroceryItem: async (item: Partial<GroceryItem>) => {
    return fetchJson<GroceryItem>('/grocery', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  updateGroceryItem: async (id: number, item: Partial<GroceryItem>) => {
    return fetchJson<GroceryItem>(`/grocery/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  },

  addMissingFromRecipe: async (recipeId: number) => {
    return fetchJson<GroceryItem[]>(`/grocery/from-recipe/${recipeId}`, {
      method: 'POST',
    });
  },

  toggleGroceryItem: async (id: number) => {
    return fetchJson<GroceryItem>(`/grocery/${id}/toggle`, {
      method: 'PATCH',
    });
  },

  movePurchasedToPantry: async () => {
    return fetchJson<{ message: string; count: number }>('/grocery/move-to-pantry', {
      method: 'POST',
    });
  },

  movePurchasedToPantryExplicit: async (items: import('../types').MovePurchasedItemIn[]) => {
    return fetchJson<{ message: string; count: number }>('/grocery/move-to-pantry', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  clearPurchasedGrocery: async () => {
    return fetchJson<{ message: string; count: number }>('/grocery/cleared', {
      method: 'DELETE',
    });
  },

  deleteGroceryItem: async (id: number) => {
    return fetchJson<void>(`/grocery/${id}`, {
      method: 'DELETE',
    });
  },

  // Meal Planner
  getMealPlans: async (params?: { start_date?: string; end_date?: string }) => {
    const query = new URLSearchParams();
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<MealPlan[]>(`/meal-plan${qs}`);
  },

  assignMealPlan: async (payload: {
    plan_date?: string;
    day_of_week?: string;
    meal_slot: string;
    recipe_id?: number | null;
    custom_meal_name?: string | null;
    planned_servings?: number;
    notes?: string | null;
    replace_existing?: boolean;
  }) => {
    return fetchJson<MealPlan>('/meal-plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateMealPlan: async (
    planId: number,
    payload: {
      planned_servings?: number;
      custom_meal_name?: string | null;
      notes?: string | null;
      recipe_id?: number | null;
    }
  ) => {
    return fetchJson<MealPlan>(`/meal-plan/${planId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteMealPlan: async (planId: number) => {
    return fetchJson<void>(`/meal-plan/${planId}`, {
      method: 'DELETE',
    });
  },

  generateShoppingListForWeek: async (startDate: string, endDate: string) => {
    return fetchJson<import('../types').GenerateWeekShoppingResponse>('/meal-plan/generate-shopping-list', {
      method: 'POST',
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate,
      }),
    });
  },

  generateGroceryFromMealPlan: async () => {
    return fetchJson<{ message: string; added_count: number }>('/meal-plan/generate-grocery', {
      method: 'POST',
    });
  },

  // Stats
  getStats: async () => {
    return fetchJson<Stats>('/stats');
  },

  // User Profile & Data Export
  updateProfile: async (data: UserProfileUpdateRequest): Promise<UserProfile> => {
    return fetchJson<UserProfile>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  exportUserData: async (): Promise<UserDataExport> => {
    const data = await fetchJson<UserDataExport>('/user/export');
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pantrypal-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    return data;
  },
};


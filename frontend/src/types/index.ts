export interface PantryItem {
  id: number;
  name: string;
  normalized_name?: string;
  category: string;
  quantity: number;
  unit: string;
  expiry_date?: string | null;
  location: string;
  storage_location?: string;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
  days_until_expiry?: number | null;
  freshness_status: 'no_date' | 'date_passed' | 'due_today' | 'due_within_three_days' | 'later' | 'fresh' | 'expiring_soon' | 'expired';
  freshness_label?: string;
}

export interface SamplePantryResponse {
  message: string;
  added_count: number;
  items: PantryItem[];
}


export interface RecipeIngredient {
  id?: number;
  recipe_id?: number;
  ingredient_name: string;
  quantity: number;
  unit: string;
  is_optional: boolean;
  notes?: string | null;
}

export interface MatchedIngredientDetail {
  ingredient_name: string;
  required_quantity: number;
  unit: string;
  is_optional: boolean;
  in_pantry: boolean;
  pantry_quantity?: number | null;
  pantry_unit?: string | null;
  is_expiring_soon: boolean;
  is_convertible: boolean;
  has_sufficient_quantity: boolean;
  status_note?: string | null;
}

export interface RecipeMatch {
  id: number;
  title: string;
  description?: string;
  cuisine: string;
  meal_type: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  difficulty: string;
  image_url?: string;
  instructions: string; // JSON array string
  calories_per_serving?: number;
  dietary_tags: string;
  allergens?: string;
  source?: string;
  created_at: string;
  ingredients: RecipeIngredient[];
  match_percentage: number;
  can_cook_now: boolean;
  readiness_status: 'ready_to_cook' | 'types_available' | 'insufficient_quantity' | 'missing_ingredients';
  readiness_label: string;
  readiness_explanation: string;
  matched_ingredients_count: number;
  total_essential_ingredients: number;
  missing_count: number;
  rescues_expiring_count: number;
  missing_ingredients: string[];
  available_ingredients: string[];
  ingredient_details: MatchedIngredientDetail[];
  is_favorite?: boolean;
}

export interface GroceryItem {
  id: number;
  name: string;
  normalized_name?: string;
  category: string;
  quantity: number;
  unit: string;
  is_purchased: boolean;
  notes?: string | null;
  needs_review?: boolean;
  review_warning?: string | null;
  recipe_source_id?: number | null;
  created_at: string;
}

export interface MealPlan {
  id: number;
  user_id?: number;
  plan_date?: string | null;
  day_of_week?: string;
  meal_slot: string;
  recipe_id?: number | null;
  planned_servings: number;
  custom_meal_name?: string | null;
  notes?: string | null;
  recipe?: RecipeMatch | null;
  created_at: string;
}

export interface MovePurchasedItemIn {
  shopping_item_id?: number | null;
  name: string;
  quantity: number;
  unit: string;
  location: string;
  expiry_date?: string | null;
}

export interface WeekShoppingIngredientExplanation {
  ingredient_name: string;
  normalized_name: string;
  total_needed: number;
  unit: string;
  pantry_amount_found?: string | null;
  pantry_subtracted_accurately: boolean;
  final_shopping_quantity: number;
  needs_review: boolean;
  review_warning?: string | null;
  explanation: string;
}

export interface GenerateWeekShoppingResponse {
  message: string;
  planned_meals_count: number;
  items_added_or_updated: number;
  explanations: WeekShoppingIngredientExplanation[];
  shopping_items: GroceryItem[];
}

export interface Stats {
  total_pantry_items: number;
  items_expiring_soon: number;
  items_expired: number;
  total_recipes: number;
  ready_to_cook_count: number;
  recipes_missing_one: number;
  low_stock_count: number;
  pantry_health_score: number;
}

export interface DeductedItem {
  name: string;
  deducted_quantity: number;
  unit: string;
  remaining_quantity: number;
}

export interface CookRecipeResponse {
  recipe_title: string;
  servings_cooked: number;
  deducted_items: DeductedItem[];
  message: string;
}

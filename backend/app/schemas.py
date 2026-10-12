import re
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

# --- Authentication & User Schemas ---
class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full or preferred name")
    email: str = Field(..., description="Unique email address")
    password: str = Field(..., min_length=8, max_length=128, description="Strong password (at least 8 chars)")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_REGEX.match(v):
            raise ValueError("Invalid email address format.")
        return v

class UserLoginRequest(BaseModel):
    email: str = Field(..., description="Account email")
    password: str = Field(..., min_length=1, description="Account password")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_REGEX.match(v):
            raise ValueError("Invalid email address format.")
        return v


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    theme_preference: str = "system"
    dietary_preferences: Optional[str] = ""
    preferred_unit: str = "metric"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(None, min_length=8, max_length=128)
    theme_preference: Optional[str] = Field(None, description="light, dark, or system")
    dietary_preferences: Optional[str] = None
    preferred_unit: Optional[str] = Field(None, description="metric or imperial")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().lower()
            if not EMAIL_REGEX.match(v):
                raise ValueError("Invalid email address format.")
            return v
        return v

    @field_validator("theme_preference")
    @classmethod
    def validate_theme(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().lower()
            if v not in ("light", "dark", "system"):
                raise ValueError("Theme must be 'light', 'dark', or 'system'.")
            return v
        return v

    @field_validator("preferred_unit")
    @classmethod
    def validate_unit_sys(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().lower()
            if v not in ("metric", "imperial"):
                raise ValueError("Preferred unit must be 'metric' or 'imperial'.")
            return v
        return v

class AuthResponse(BaseModel):
    user: UserResponse
    csrf_token: str
    message: str

# --- Pantry Schemas ---
class PantryItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Ingredient name")
    category: str = Field(default="Other", description="Ingredient category")
    quantity: float = Field(default=1.0, ge=0, description="Quantity in stock")
    unit: str = Field(default="pcs", description="Supported culinary unit")
    expiry_date: Optional[date] = Field(
        default=None,
        description="Calendar date (YYYY-MM-DD). Date-only semantics; organizational reminder, not food-safety guarantee."
    )
    location: str = Field(default="Pantry", description="Storage location (e.g. Fridge, Pantry, Freezer, Counter)")
    storage_location: Optional[str] = Field(default=None, description="Alias for storage location")
    is_low_stock: bool = False

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Ingredient name cannot be blank.")
        return v

    @field_validator("unit")
    @classmethod
    def validate_unit(cls, v: str) -> str:
        from app.normalization import validate_and_normalize_unit
        return validate_and_normalize_unit(v)


class PantryItemCreate(PantryItemBase):
    quantity: float = Field(default=1.0, gt=0, description="Quantity must be strictly positive (> 0)")



class PantryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = Field(None, gt=0, description="Quantity must be strictly positive (> 0)")
    unit: Optional[str] = None
    expiry_date: Optional[date] = Field(
        None,
        description="Calendar date (YYYY-MM-DD). Date-only semantics; organizational reminder, not food-safety guarantee."
    )
    location: Optional[str] = None
    storage_location: Optional[str] = None
    is_low_stock: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Ingredient name cannot be blank.")
        return v

    @field_validator("unit")
    @classmethod
    def validate_unit(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            from app.normalization import validate_and_normalize_unit
            return validate_and_normalize_unit(v)
        return v


class PantryItemResponse(PantryItemBase):
    id: int
    user_id: int
    normalized_name: str
    storage_location: str
    created_at: datetime
    updated_at: datetime
    days_until_expiry: Optional[int] = None
    freshness_status: str = "no_date"  # no_date, date_passed, due_today, due_within_three_days, later
    freshness_label: str = "No date"   # No date, Date passed, Due today, Due within 3 days, Later

    model_config = ConfigDict(from_attributes=True)


class PantryBatchCreate(BaseModel):
    items: List[PantryItemCreate]


class SamplePantryResponse(BaseModel):
    message: str
    added_count: int
    items: List[PantryItemResponse]

# --- Recipe Ingredient Schemas ---
class RecipeIngredientBase(BaseModel):
    ingredient_name: str
    quantity: float
    unit: str
    is_optional: bool = False
    notes: Optional[str] = None

class RecipeIngredientCreate(RecipeIngredientBase):
    pass

class RecipeIngredientResponse(RecipeIngredientBase):
    id: int
    recipe_id: int

    model_config = ConfigDict(from_attributes=True)

class MatchedIngredientDetail(BaseModel):
    ingredient_name: str
    required_quantity: float
    unit: str
    is_optional: bool
    in_pantry: bool
    pantry_quantity: Optional[float] = None
    pantry_unit: Optional[str] = None
    is_expiring_soon: bool = False
    is_convertible: bool = True
    has_sufficient_quantity: bool = False
    status_note: Optional[str] = None

# --- Recipe Schemas ---
class RecipeBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    cuisine: str = "International"
    meal_type: str = "Dinner"
    prep_time_minutes: int = 15
    cook_time_minutes: int = 20
    servings: int = 2
    difficulty: str = "Easy"
    image_url: Optional[str] = None
    instructions: str  # JSON list of strings or text
    calories_per_serving: Optional[int] = None
    dietary_tags: str = ""
    allergens: str = ""
    source: str = "sample"

class RecipeCreate(RecipeBase):
    ingredients: List[RecipeIngredientCreate]

class RecipeResponse(RecipeBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime
    ingredients: List[RecipeIngredientResponse] = []
    is_favorite: bool = False

    model_config = ConfigDict(from_attributes=True)

class RecipeMatchResponse(RecipeResponse):
    match_percentage: float
    can_cook_now: bool
    readiness_status: str = "missing_ingredients"  # ready_to_cook, types_available, insufficient_quantity, missing_ingredients
    readiness_label: str = "Missing ingredients"    # "Ready to cook", "All ingredient types available", etc.
    readiness_explanation: str = ""
    matched_ingredients_count: int
    total_essential_ingredients: int
    missing_count: int
    rescues_expiring_count: int
    missing_ingredients: List[str] = []
    available_ingredients: List[str] = []
    ingredient_details: List[MatchedIngredientDetail] = []

class CookRecipeRequest(BaseModel):
    servings: Optional[int] = None

class DeductedItemInfo(BaseModel):
    name: str
    deducted_quantity: float
    unit: str
    remaining_quantity: float

class CookRecipeResponse(BaseModel):
    recipe_title: str
    servings_cooked: int
    deducted_items: List[DeductedItemInfo]
    message: str

# --- Shopping / Grocery Schemas ---
class ShoppingItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    normalized_name: Optional[str] = None
    category: str = "General"
    quantity: float = Field(default=1.0, ge=0)
    unit: str = "pcs"
    is_purchased: bool = False
    notes: Optional[str] = None
    needs_review: bool = False
    review_warning: Optional[str] = None
    recipe_source_id: Optional[int] = None

class ShoppingItemCreate(ShoppingItemBase):
    pass

class ShoppingItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    is_purchased: Optional[bool] = None
    notes: Optional[str] = None
    needs_review: Optional[bool] = None
    review_warning: Optional[str] = None

class ShoppingItemResponse(ShoppingItemBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Explicit Move Purchased to Pantry Schemas
class MovePurchasedItemIn(BaseModel):
    shopping_item_id: Optional[int] = None
    name: str = Field(..., min_length=1)
    quantity: float = Field(..., gt=0)
    unit: str = "pcs"
    location: str = "Pantry"
    expiry_date: Optional[str] = None

class MovePurchasedToPantryRequest(BaseModel):
    items: Optional[List[MovePurchasedItemIn]] = None

# Aliases for backward compatibility
GroceryItemBase = ShoppingItemBase
GroceryItemCreate = ShoppingItemCreate
GroceryItemUpdate = ShoppingItemUpdate
GroceryItemResponse = ShoppingItemResponse

# --- Meal Plan Schemas ---
class MealPlanCreate(BaseModel):
    plan_date: Optional[str] = None  # YYYY-MM-DD
    day_of_week: Optional[str] = None
    meal_slot: str  # Breakfast, Lunch, Dinner, Snack
    recipe_id: Optional[int] = None
    custom_meal_name: Optional[str] = None
    planned_servings: int = Field(default=2, ge=1)
    notes: Optional[str] = None
    replace_existing: bool = False

class MealPlanUpdate(BaseModel):
    planned_servings: Optional[int] = Field(default=None, ge=1)
    custom_meal_name: Optional[str] = None
    notes: Optional[str] = None
    recipe_id: Optional[int] = None

class MealPlanResponse(BaseModel):
    id: int
    user_id: int
    plan_date: Optional[str] = None
    day_of_week: Optional[str] = None
    meal_slot: str
    recipe_id: Optional[int] = None
    planned_servings: int = 2
    custom_meal_name: Optional[str] = None
    notes: Optional[str] = None
    recipe: Optional[RecipeResponse] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Weekly Meal Plan Shopping List Generation Schemas
class GenerateWeekShoppingRequest(BaseModel):
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD

class WeekShoppingIngredientExplanation(BaseModel):
    ingredient_name: str
    normalized_name: str
    total_needed: float
    unit: str
    pantry_amount_found: Optional[str] = None
    pantry_subtracted_accurately: bool
    final_shopping_quantity: float
    needs_review: bool = False
    review_warning: Optional[str] = None
    explanation: str

class GenerateWeekShoppingResponse(BaseModel):
    message: str
    planned_meals_count: int
    items_added_or_updated: int
    explanations: List[WeekShoppingIngredientExplanation]
    shopping_items: List[ShoppingItemResponse]

# --- Favorite Schemas ---
class FavoriteResponse(BaseModel):
    id: int
    user_id: int
    recipe_id: int
    created_at: datetime
    recipe: Optional[RecipeResponse] = None

    model_config = ConfigDict(from_attributes=True)

# --- Stats Schema ---
class StatsResponse(BaseModel):
    total_pantry_items: int
    items_expiring_soon: int
    items_expired: int
    total_recipes: int
    ready_to_cook_count: int
    recipes_missing_one: int
    low_stock_count: int
    pantry_health_score: int  # 0 to 100 based on freshness and pantry variety

# --- User Data Export Schema (Zero sensitive tokens, strictly scoped) ---
class UserDataExportResponse(BaseModel):
    export_version: str = "1.0"
    exported_at: datetime
    user: UserResponse
    pantry_items: List[PantryItemResponse]
    shopping_items: List[ShoppingItemResponse]
    meal_plans: List[MealPlanResponse]
    favorites: List[FavoriteResponse]
    summary: dict

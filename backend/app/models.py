from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    Date,
    DateTime,
    Text,
    ForeignKey,
    UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    theme_preference = Column(String(20), default="system", nullable=False)
    dietary_preferences = Column(String(255), default="", nullable=True)
    preferred_unit = Column(String(20), default="metric", nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Scoped user relationships with cascade deletion
    pantry_items = relationship("PantryItem", back_populates="user", cascade="all, delete-orphan")
    recipes = relationship("Recipe", back_populates="user", cascade="all, delete-orphan")
    shopping_items = relationship("ShoppingItem", back_populates="user", cascade="all, delete-orphan")
    meal_plans = relationship("MealPlan", back_populates="user", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_token = Column(String(128), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    csrf_token = Column(String(128), nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="sessions")


class PantryItem(Base):
    __tablename__ = "pantry_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    normalized_name = Column(String(100), nullable=False, default="", index=True)
    category = Column(String(50), nullable=False, default="Other")
    quantity = Column(Float, nullable=False, default=1.0)
    unit = Column(String(30), nullable=False, default="pcs")
    expiry_date = Column(Date, nullable=True)
    location = Column(String(30), nullable=False, default="Pantry")  # Pantry, Fridge, Freezer, Counter
    is_low_stock = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="pantry_items")


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    # user_id is nullable: NULL means community/system preset, non-null means user's custom recipe
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    cuisine = Column(String(50), default="International")
    meal_type = Column(String(50), default="Dinner")  # Breakfast, Lunch, Dinner, Snack, Dessert
    prep_time_minutes = Column(Integer, default=15)
    cook_time_minutes = Column(Integer, default=20)
    servings = Column(Integer, default=2)
    difficulty = Column(String(20), default="Easy")  # Easy, Medium, Hard
    image_url = Column(Text, nullable=True)
    instructions = Column(Text, nullable=False)  # JSON-encoded array or newline-delimited text
    calories_per_serving = Column(Integer, nullable=True)
    dietary_tags = Column(String(200), default="")  # Comma-separated: Vegetarian, Gluten-Free, High-Protein, etc.
    allergens = Column(String(200), default="", nullable=True)  # Clearly identified allergens (e.g. Dairy, Eggs, Gluten)
    source = Column(String(50), default="sample", nullable=True)  # "sample" (kitchen tested) or "user" / "external"
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="recipes")
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan", lazy="joined")
    meal_plans = relationship("MealPlan", back_populates="recipe", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="recipe", cascade="all, delete-orphan")


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True)
    ingredient_name = Column(String(100), nullable=False)
    quantity = Column(Float, nullable=False, default=1.0)
    unit = Column(String(30), nullable=False, default="pcs")
    is_optional = Column(Boolean, default=False)
    notes = Column(String(100), nullable=True)

    recipe = relationship("Recipe", back_populates="ingredients")


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "recipe_id", name="uq_user_recipe_favorite"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="favorites")
    recipe = relationship("Recipe", back_populates="favorites")


class ShoppingItem(Base):
    __tablename__ = "shopping_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    normalized_name = Column(String(100), nullable=True, index=True)
    category = Column(String(50), default="General")
    quantity = Column(Float, default=1.0)
    unit = Column(String(30), default="pcs")
    is_purchased = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    needs_review = Column(Boolean, default=False)
    review_warning = Column(Text, nullable=True)
    recipe_source_id = Column(Integer, ForeignKey("recipes.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="shopping_items")
    recipe_source = relationship("Recipe")

# Backward compatibility alias
GroceryItem = ShoppingItem


class MealPlan(Base):
    __tablename__ = "meal_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_date = Column(Date, nullable=True, index=True)  # Date-based planning (YYYY-MM-DD)
    day_of_week = Column(String(20), nullable=True)     # Monday, Tuesday, ... Sunday
    meal_slot = Column(String(20), nullable=False)       # Breakfast, Lunch, Dinner, Snack
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=True, index=True)
    planned_servings = Column(Integer, default=2, nullable=False)
    custom_meal_name = Column(String(150), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="meal_plans")
    recipe = relationship("Recipe", back_populates="meal_plans")

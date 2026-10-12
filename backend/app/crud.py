import re
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple, Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app import models, schemas
from app.auth import hash_password, verify_password
from app.normalization import (
    normalize_ingredient_name,
    ingredients_match,
    validate_and_normalize_unit,
    calculate_freshness_state,
    get_sample_pantry_items,
    can_convert_units,
    convert_unit_quantity,
)

# --- Backward compatibility alias ---
normalize_name = normalize_ingredient_name

def calculate_freshness(expiry_date: Optional[date]) -> Tuple[Optional[int], str, str]:
    """
    Returns (days_until_expiry, freshness_status, freshness_label).
    """
    return calculate_freshness_state(expiry_date)


# --- User CRUD ---
def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(func.lower(models.User.email) == email.lower().strip()).first()

def get_user_by_id(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()

def create_user(db: Session, user_in: schemas.UserRegisterRequest) -> models.User:
    hashed_pwd = hash_password(user_in.password)
    user = models.User(
        email=user_in.email.lower().strip(),
        name=user_in.name.strip(),
        hashed_password=hashed_pwd
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def update_user_profile(
    db: Session,
    user_id: int,
    profile_in: schemas.UserProfileUpdateRequest
) -> models.User:
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError("User not found.")

    if profile_in.email is not None:
        clean_email = profile_in.email.strip().lower()
        if clean_email != user.email:
            existing = get_user_by_email(db, clean_email)
            if existing and existing.id != user_id:
                raise ValueError("An account with this email address already exists.")
            user.email = clean_email

    if profile_in.name is not None:
        clean_name = profile_in.name.strip()
        if clean_name:
            user.name = clean_name

    if profile_in.new_password is not None:
        if not profile_in.current_password:
            raise ValueError("Current password is required to set a new password.")
        if not verify_password(profile_in.current_password, user.hashed_password):
            raise ValueError("Current password is incorrect.")
        user.hashed_password = hash_password(profile_in.new_password)

    if profile_in.theme_preference is not None:
        user.theme_preference = profile_in.theme_preference.strip().lower()

    if profile_in.dietary_preferences is not None:
        user.dietary_preferences = profile_in.dietary_preferences.strip()

    if profile_in.preferred_unit is not None:
        user.preferred_unit = profile_in.preferred_unit.strip().lower()

    db.commit()
    db.refresh(user)
    return user

def export_user_data(db: Session, user_id: int) -> dict:
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError("User not found.")

    pantry_items = get_pantry_items(db, user_id=user_id)
    shopping_items = get_shopping_items(db, user_id=user_id)
    meal_plans = get_meal_plans(db, user_id=user_id)
    favorites = get_user_favorites(db, user_id=user_id)

    return {
        "export_version": "1.0",
        "exported_at": datetime.now(timezone.utc),
        "user": schemas.UserResponse.model_validate(user),
        "pantry_items": pantry_items,
        "shopping_items": [schemas.ShoppingItemResponse.model_validate(i) for i in shopping_items],
        "meal_plans": meal_plans,
        "favorites": favorites,
        "summary": {
            "total_pantry_items": len(pantry_items),
            "total_shopping_items": len(shopping_items),
            "total_meal_plans": len(meal_plans),
            "total_favorites": len(favorites),
        }
    }


# --- Pantry Operations (Scoped to User) ---
def get_pantry_items(
    db: Session,
    user_id: int,
    category: Optional[str] = None,
    location: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: Optional[str] = "expiry_asc"
) -> List[schemas.PantryItemResponse]:
    query = db.query(models.PantryItem).filter(models.PantryItem.user_id == user_id)
    if category and category != "All":
        query = query.filter(models.PantryItem.category == category)
    if location and location != "All":
        query = query.filter(models.PantryItem.location == location)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.PantryItem.name.ilike(s),
                models.PantryItem.normalized_name.ilike(s),
                models.PantryItem.category.ilike(s)
            )
        )

    # Sorting
    if sort_by == "expiry_desc":
        query = query.order_by(models.PantryItem.expiry_date.desc().nullslast(), models.PantryItem.name.asc())
    elif sort_by == "name_asc":
        query = query.order_by(models.PantryItem.name.asc())
    elif sort_by == "name_desc":
        query = query.order_by(models.PantryItem.name.desc())
    elif sort_by == "quantity_desc":
        query = query.order_by(models.PantryItem.quantity.desc())
    elif sort_by == "quantity_asc":
        query = query.order_by(models.PantryItem.quantity.asc())
    elif sort_by == "recent":
        query = query.order_by(models.PantryItem.updated_at.desc())
    else:  # default: soonest expiry first
        query = query.order_by(models.PantryItem.expiry_date.asc().nullslast(), models.PantryItem.name.asc())

    items = query.all()

    result: List[schemas.PantryItemResponse] = []
    for item in items:
        days, fresh_status, fresh_label = calculate_freshness_state(item.expiry_date)
        if status and status != "All":
            # Support both exact new status codes and legacy filter keys
            if status in ("due_today",) and fresh_status != "due_today":
                continue
            if status in ("due_within_three_days", "expiring_soon") and fresh_status not in ("due_today", "due_within_three_days"):
                continue
            if status in ("date_passed", "expired") and fresh_status != "date_passed":
                continue
            if status in ("later", "fresh") and fresh_status != "later":
                continue
            if status in ("no_date",) and fresh_status != "no_date":
                continue

        p_dict = {
            "id": item.id,
            "user_id": item.user_id,
            "name": item.name,
            "normalized_name": item.normalized_name or normalize_ingredient_name(item.name),
            "category": item.category,
            "quantity": item.quantity,
            "unit": item.unit,
            "expiry_date": item.expiry_date,
            "location": item.location,
            "storage_location": item.location,
            "is_low_stock": item.is_low_stock,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
            "days_until_expiry": days,
            "freshness_status": fresh_status,
            "freshness_label": fresh_label
        }
        result.append(schemas.PantryItemResponse(**p_dict))
    return result

def get_pantry_item_by_id(db: Session, user_id: int, item_id: int) -> Optional[models.PantryItem]:
    return db.query(models.PantryItem).filter(
        models.PantryItem.id == item_id,
        models.PantryItem.user_id == user_id
    ).first()

def create_pantry_item(db: Session, user_id: int, item_in: schemas.PantryItemCreate) -> models.PantryItem:
    clean_name = item_in.name.strip()
    norm_name = normalize_ingredient_name(clean_name)
    clean_unit = validate_and_normalize_unit(item_in.unit)
    loc = (item_in.storage_location or item_in.location or "Pantry").strip()

    # Multi-batch support:
    # Multiple batches of the same ingredient with DIFFERENT dates are preserved as separate records.
    # If and only if user_id, normalized_name, location, unit, AND expiry_date match identically,
    # we aggregate the quantity on the existing batch record.
    existing = db.query(models.PantryItem).filter(
        models.PantryItem.user_id == user_id,
        models.PantryItem.normalized_name == norm_name,
        models.PantryItem.location == loc,
        models.PantryItem.unit == clean_unit,
        models.PantryItem.expiry_date == item_in.expiry_date
    ).first()

    if existing:
        existing.quantity = round(existing.quantity + item_in.quantity, 2)
        existing.is_low_stock = existing.quantity <= 1.0
        db.commit()
        db.refresh(existing)
        return existing

    new_item = models.PantryItem(
        user_id=user_id,
        name=clean_name,
        normalized_name=norm_name,
        category=item_in.category or "Other",
        quantity=round(item_in.quantity, 2),
        unit=clean_unit,
        expiry_date=item_in.expiry_date,
        location=loc,
        is_low_stock=item_in.quantity <= 1.0 or item_in.is_low_stock
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

def create_pantry_items_batch(
    db: Session,
    user_id: int,
    items_in: List[schemas.PantryItemCreate]
) -> List[models.PantryItem]:
    created = []
    for item_in in items_in:
        item = create_pantry_item(db, user_id, item_in)
        created.append(item)
    return created

def update_pantry_item(
    db: Session,
    user_id: int,
    item_id: int,
    item_in: schemas.PantryItemUpdate
) -> Optional[models.PantryItem]:
    item = get_pantry_item_by_id(db, user_id, item_id)
    if not item:
        return None
    data = item_in.model_dump(exclude_unset=True)
    if "name" in data and data["name"]:
        data["name"] = data["name"].strip()
        data["normalized_name"] = normalize_ingredient_name(data["name"])
    if "unit" in data and data["unit"]:
        data["unit"] = validate_and_normalize_unit(data["unit"])
    if "storage_location" in data and data["storage_location"]:
        data["location"] = data.pop("storage_location")

    for field, val in data.items():
        if hasattr(item, field):
            setattr(item, field, val)

    if item.quantity <= 0:
        item.is_low_stock = True
    else:
        item.is_low_stock = item.quantity <= 1.0
    db.commit()
    db.refresh(item)
    return item

def delete_pantry_item(db: Session, user_id: int, item_id: int) -> bool:
    item = get_pantry_item_by_id(db, user_id, item_id)
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True

def load_sample_pantry(db: Session, user_id: int) -> Tuple[int, List[models.PantryItem]]:
    """
    Seeds a balanced starter pantry without ever overwriting existing user records.
    Only adds ingredients that are not currently in the user's kitchen inventory.
    """
    existing_items = db.query(models.PantryItem).filter(models.PantryItem.user_id == user_id).all()
    existing_keys = {
        (item.normalized_name or normalize_ingredient_name(item.name), item.location.lower())
        for item in existing_items
    }

    sample_items = get_sample_pantry_items()
    added: List[models.PantryItem] = []

    for sample in sample_items:
        norm = normalize_ingredient_name(sample["name"])
        loc = sample["location"].lower()
        # Strictly never overwrite or duplicate existing records
        if (norm, loc) in existing_keys:
            continue

        item_in = schemas.PantryItemCreate(
            name=sample["name"],
            category=sample["category"],
            quantity=sample["quantity"],
            unit=sample["unit"],
            location=sample["location"],
            expiry_date=sample["expiry_date"]
        )
        created = create_pantry_item(db, user_id, item_in)
        added.append(created)
        existing_keys.add((norm, loc))

    return len(added), added



# --- Recipe Operations & Smart Matching ---
def get_recipes(db: Session, user_id: Optional[int] = None) -> List[models.Recipe]:
    # Returns preset/community recipes (user_id IS NULL) + user's own custom recipes
    query = db.query(models.Recipe)
    if user_id:
        query = query.filter(or_(models.Recipe.user_id == None, models.Recipe.user_id == user_id))
    else:
        query = query.filter(models.Recipe.user_id == None)
    return query.order_by(models.Recipe.title.asc()).all()

def get_recipe_by_id(db: Session, recipe_id: int) -> Optional[models.Recipe]:
    return db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()

def create_recipe(db: Session, user_id: int, recipe_in: schemas.RecipeCreate) -> models.Recipe:
    recipe = models.Recipe(
        user_id=user_id,
        title=recipe_in.title,
        description=recipe_in.description,
        cuisine=recipe_in.cuisine,
        meal_type=recipe_in.meal_type,
        prep_time_minutes=recipe_in.prep_time_minutes,
        cook_time_minutes=recipe_in.cook_time_minutes,
        servings=recipe_in.servings,
        difficulty=recipe_in.difficulty,
        image_url=recipe_in.image_url,
        instructions=recipe_in.instructions,
        calories_per_serving=recipe_in.calories_per_serving,
        dietary_tags=recipe_in.dietary_tags,
        allergens=recipe_in.allergens,
        source=recipe_in.source or "user"
    )
    db.add(recipe)
    db.flush()

    for ing in recipe_in.ingredients:
        recipe_ing = models.RecipeIngredient(
            recipe_id=recipe.id,
            ingredient_name=ing.ingredient_name.strip(),
            quantity=ing.quantity,
            unit=ing.unit,
            is_optional=ing.is_optional,
            notes=ing.notes
        )
        db.add(recipe_ing)
    
    db.commit()
    db.refresh(recipe)
    return recipe

def match_recipes_against_pantry(
    db: Session,
    user_id: int,
    min_match: Optional[float] = None,
    dietary_tag: Optional[str] = None,
    meal_type: Optional[str] = None,
    max_time: Optional[int] = None,
    search: Optional[str] = None,
    sort_by: str = "match_desc",
    include_expired: bool = False,
    only_saved: bool = False,
    near_match: Optional[str] = None
) -> List[schemas.RecipeMatchResponse]:
    today = date.today()
    query = db.query(models.PantryItem).filter(
        models.PantryItem.user_id == user_id,
        models.PantryItem.quantity > 0
    )
    # Exclude past-date items from matching by default
    if not include_expired:
        query = query.filter(or_(models.PantryItem.expiry_date == None, models.PantryItem.expiry_date >= today))

    pantry_items = query.all()
    recipes = db.query(models.Recipe).filter(
        or_(models.Recipe.user_id == None, models.Recipe.user_id == user_id)
    ).all()

    # User favorites
    fav_ids = set(f.recipe_id for f in db.query(models.Favorite).filter(models.Favorite.user_id == user_id).all())

    expiring_soon_threshold = today + timedelta(days=3)
    results: List[schemas.RecipeMatchResponse] = []

    for recipe in recipes:
        if only_saved and recipe.id not in fav_ids:
            continue

        if dietary_tag and dietary_tag.lower() != "all":
            tag_clean = dietary_tag.strip().lower()
            recipe_tags = [t.strip().lower() for t in (recipe.dietary_tags or "").split(",") if t.strip()]
            # Include vegan recipes in vegetarian results
            if tag_clean == "vegetarian":
                if "vegetarian" not in recipe_tags and "vegan" not in recipe_tags:
                    continue
            else:
                if tag_clean not in recipe_tags:
                    continue

        if meal_type and meal_type != "All" and recipe.meal_type.lower() != meal_type.lower():
            continue

        total_time = (recipe.prep_time_minutes or 0) + (recipe.cook_time_minutes or 0)
        if max_time and total_time > max_time:
            continue

        if search and search.strip():
            s = search.strip().lower()
            title_match = s in recipe.title.lower()
            desc_match = s in (recipe.description or "").lower()
            cuisine_match = s in (recipe.cuisine or "").lower()
            ing_match = any(s in ing.ingredient_name.lower() for ing in recipe.ingredients)
            if not (title_match or desc_match or cuisine_match or ing_match):
                continue

        ingredient_details: List[schemas.MatchedIngredientDetail] = []
        matched_essential = 0
        total_essential = 0
        missing_count = 0
        rescues_expiring = 0
        all_quantities_checkable = True
        all_quantities_sufficient = True
        available_ingredients: List[str] = []
        missing_ingredients: List[str] = []

        for ing in recipe.ingredients:
            if not ing.is_optional:
                total_essential += 1

            # Match across all batches of the ingredient
            matching_batches = [
                p for p in pantry_items
                if ingredients_match(ing.ingredient_name, p.name) or (p.normalized_name and ingredients_match(ing.ingredient_name, p.normalized_name))
            ]

            total_raw_qty = sum(b.quantity for b in matching_batches)
            in_pantry = len(matching_batches) > 0 and total_raw_qty > 0
            is_expiring = any(
                b.expiry_date is not None and today <= b.expiry_date <= expiring_soon_threshold
                for b in matching_batches
            )
            pantry_unit = matching_batches[0].unit if matching_batches else None

            is_convertible = True
            has_sufficient = False
            status_note = None

            if in_pantry:
                if not ing.is_optional:
                    matched_essential += 1
                    available_ingredients.append(ing.ingredient_name)
                if is_expiring:
                    rescues_expiring += 1

                # Check unit conversion across all matching batches
                batch_convertible = True
                total_converted_qty = 0.0
                for b in matching_batches:
                    if can_convert_units(b.unit, ing.unit):
                        c_qty = convert_unit_quantity(b.quantity, b.unit, ing.unit)
                        if c_qty is not None:
                            total_converted_qty += c_qty
                        else:
                            batch_convertible = False
                    else:
                        batch_convertible = False

                if not batch_convertible:
                    # Incompatible dimension (e.g. volume vs weight) - do NOT assume volume-to-weight conversions
                    is_convertible = False
                    if not ing.is_optional:
                        all_quantities_checkable = False
                    has_sufficient = False
                    status_note = f"In pantry ({round(total_raw_qty, 2)} {pantry_unit}), but cannot convert to {ing.unit} without food density."
                else:
                    is_convertible = True
                    has_sufficient = total_converted_qty >= ing.quantity
                    if not has_sufficient and not ing.is_optional:
                        all_quantities_sufficient = False
                    status_note = f"Pantry: {round(total_converted_qty, 2)} {ing.unit} (need {ing.quantity} {ing.unit})"
            else:
                if not ing.is_optional:
                    missing_count += 1
                    missing_ingredients.append(ing.ingredient_name)
                status_note = "Missing from kitchen stock"

            ingredient_details.append(
                schemas.MatchedIngredientDetail(
                    ingredient_name=ing.ingredient_name,
                    required_quantity=ing.quantity,
                    unit=ing.unit,
                    is_optional=ing.is_optional,
                    in_pantry=in_pantry,
                    pantry_quantity=round(total_raw_qty, 2) if in_pantry else None,
                    pantry_unit=pantry_unit,
                    is_expiring_soon=is_expiring,
                    is_convertible=is_convertible,
                    has_sufficient_quantity=has_sufficient,
                    status_note=status_note
                )
            )

        if total_essential == 0:
            total_essential = len(recipe.ingredients) if len(recipe.ingredients) > 0 else 1

        # Base match score: Available non-expired ingredient types / total required ingredient types * 100
        match_pct = round((matched_essential / total_essential * 100.0), 1)

        # Readiness classification
        # Do not label a recipe "ready to cook" unless quantities can be checked reliably.
        # Otherwise say "all ingredient types available."
        if missing_count > 0:
            readiness_status = "missing_ingredients"
            readiness_label = f"Missing {missing_count} item{'s' if missing_count > 1 else ''}"
            readiness_explanation = f"You are missing {missing_count} required ingredient{'s' if missing_count > 1 else ''}: {', '.join(missing_ingredients)}."
            can_cook_now = False
        else:
            if not all_quantities_checkable:
                readiness_status = "types_available"
                readiness_label = "All ingredient types available"
                readiness_explanation = "All ingredient types exist in your pantry, but physical quantities cannot be reliably verified due to volume/weight unit differences. Check pantry stock before cooking."
                can_cook_now = False
            else:
                if all_quantities_sufficient:
                    readiness_status = "ready_to_cook"
                    readiness_label = "Ready to cook"
                    readiness_explanation = "All required ingredient types and quantities are fully verified in your pantry."
                    can_cook_now = True
                else:
                    readiness_status = "insufficient_quantity"
                    readiness_label = "Insufficient quantity"
                    readiness_explanation = "All ingredient types are in your pantry, but some quantities are less than this recipe requires."
                    can_cook_now = False

        if min_match is not None and match_pct < min_match:
            continue

        if near_match:
            if near_match == "ready" and readiness_status != "ready_to_cook":
                continue
            if near_match == "types_available" and missing_count != 0:
                continue
            if near_match == "missing_one" and missing_count != 1:
                continue
            if near_match == "missing_few" and not (1 <= missing_count <= 2):
                continue
            if near_match == "high_match" and match_pct < 70.0:
                continue

        res = schemas.RecipeMatchResponse(
            id=recipe.id,
            user_id=recipe.user_id,
            title=recipe.title,
            description=recipe.description,
            cuisine=recipe.cuisine,
            meal_type=recipe.meal_type,
            prep_time_minutes=recipe.prep_time_minutes,
            cook_time_minutes=recipe.cook_time_minutes,
            servings=recipe.servings,
            difficulty=recipe.difficulty,
            image_url=recipe.image_url,
            instructions=recipe.instructions,
            calories_per_serving=recipe.calories_per_serving,
            dietary_tags=recipe.dietary_tags or "",
            allergens=recipe.allergens or "",
            source=recipe.source or "sample",
            created_at=recipe.created_at,
            ingredients=[schemas.RecipeIngredientResponse.model_validate(i) for i in recipe.ingredients],
            match_percentage=match_pct,
            can_cook_now=can_cook_now,
            readiness_status=readiness_status,
            readiness_label=readiness_label,
            readiness_explanation=readiness_explanation,
            matched_ingredients_count=matched_essential,
            total_essential_ingredients=total_essential,
            missing_count=missing_count,
            rescues_expiring_count=rescues_expiring,
            missing_ingredients=missing_ingredients,
            available_ingredients=available_ingredients,
            ingredient_details=ingredient_details,
            is_favorite=recipe.id in fav_ids
        )
        results.append(res)

    # Deterministic ranking:
    # 1. Match score (descending)
    # 2. Use-soon / expiring ingredients (descending)
    # 3. Cooking time (ascending)
    # 4. Prep time (ascending)
    # 5. Stable recipe ID (ascending)
    if sort_by == "match_desc":
        results.sort(key=lambda x: (-x.match_percentage, -x.rescues_expiring_count, x.cook_time_minutes, x.prep_time_minutes, x.id))
    elif sort_by == "rescues_desc":
        results.sort(key=lambda x: (-x.rescues_expiring_count, -x.match_percentage, x.cook_time_minutes, x.prep_time_minutes, x.id))
    elif sort_by == "time_asc":
        results.sort(key=lambda x: (x.cook_time_minutes + x.prep_time_minutes, -x.match_percentage, -x.rescues_expiring_count, x.id))
    else:
        results.sort(key=lambda x: (-x.match_percentage, -x.rescues_expiring_count, x.cook_time_minutes, x.prep_time_minutes, x.id))

    return results

def cook_recipe(
    db: Session,
    user_id: int,
    recipe_id: int,
    servings: Optional[int] = None
) -> Optional[schemas.CookRecipeResponse]:
    """
    Deducts required ingredients from user's real pantry items.
    Deducts from earliest-expiring batch first (FIFO).
    Excludes expired items from automatic deduction by default.
    """
    recipe = get_recipe_by_id(db, recipe_id)
    if not recipe:
        return None

    actual_servings = servings if servings and servings > 0 else recipe.servings
    multiplier = actual_servings / (recipe.servings if recipe.servings > 0 else 1)

    today = date.today()
    # Sort earliest expiring first, nulls last
    pantry_items = db.query(models.PantryItem).filter(
        models.PantryItem.user_id == user_id,
        models.PantryItem.quantity > 0,
        or_(models.PantryItem.expiry_date == None, models.PantryItem.expiry_date >= today)
    ).order_by(models.PantryItem.expiry_date.asc().nullslast()).all()

    deducted_items: List[schemas.DeductedItemInfo] = []

    for ing in recipe.ingredients:
        needed_qty = ing.quantity * multiplier
        for p in pantry_items:
            if needed_qty <= 0:
                break
            if (ingredients_match(ing.ingredient_name, p.name) or (p.normalized_name and ingredients_match(ing.ingredient_name, p.normalized_name))) and p.quantity > 0:
                deduct_amount = min(p.quantity, needed_qty)
                p.quantity = max(0.0, round(p.quantity - deduct_amount, 2))
                if p.quantity <= 1.0:
                    p.is_low_stock = True

                deducted_items.append(
                    schemas.DeductedItemInfo(
                        name=p.name,
                        deducted_quantity=round(deduct_amount, 2),
                        unit=p.unit,
                        remaining_quantity=round(p.quantity, 2)
                    )
                )
                needed_qty -= deduct_amount

    db.commit()

    return schemas.CookRecipeResponse(
        recipe_title=recipe.title,
        servings_cooked=actual_servings,
        deducted_items=deducted_items,
        message=f"Enjoy your meal! Deducted ingredients from your pantry inventory for {actual_servings} servings of {recipe.title}."
    )

def add_missing_recipe_ingredients_to_grocery(
    db: Session,
    user_id: int,
    recipe_id: int
) -> List[models.ShoppingItem]:
    recipe = get_recipe_by_id(db, recipe_id)
    if not recipe:
        return []

    today_dt = date.today()
    pantry_items = db.query(models.PantryItem).filter(
        models.PantryItem.user_id == user_id,
        models.PantryItem.quantity > 0
    ).all()
    non_expired_pantry = [p for p in pantry_items if not p.expiry_date or p.expiry_date >= today_dt]

    added_items: List[models.ShoppingItem] = []

    for ing in recipe.ingredients:
        if ing.is_optional:
            continue

        ing_norm = normalize_ingredient_name(ing.ingredient_name)
        try:
            ing_unit = validate_and_normalize_unit(ing.unit)
        except ValueError:
            ing_unit = ing.unit.strip().lower()

        matching_pantry = [
            p for p in non_expired_pantry
            if p.normalized_name == ing_norm or ingredients_match(ing.ingredient_name, p.name)
        ]

        qty_needed = ing.quantity
        needs_review = False
        review_warning = None
        notes = f"For {recipe.title}"

        if matching_pantry:
            # Check unit compatibility with all matching pantry items
            can_convert_all = all(can_convert_units(p.unit, ing_unit) for p in matching_pantry)
            if can_convert_all:
                total_pantry = sum(
                    convert_unit_quantity(p.quantity, p.unit, ing_unit) or 0.0
                    for p in matching_pantry
                )
                if total_pantry >= ing.quantity:
                    # Stock is sufficient; do not add to shopping list
                    continue
                else:
                    qty_needed = round(ing.quantity - total_pantry, 2)
                    notes += f" (Subtracted {round(total_pantry, 1)} {ing_unit} from pantry)"
            else:
                # Incompatible units! Do NOT silently assume pantry quantities are sufficient.
                pantry_summary = ", ".join(f"{p.quantity} {p.unit}" for p in matching_pantry)
                needs_review = True
                review_warning = (
                    f"Pantry stock has {pantry_summary} of '{ing.ingredient_name}', but recipe requires {ing.quantity} {ing_unit}. "
                    "Cannot safely convert units without density assumptions. Showing full recipe amount for review."
                )
                qty_needed = ing.quantity
                notes += f" (Pantry unit mismatch: {pantry_summary})"

        # Deduplicate and aggregate into persistent shopping list
        item_in = schemas.ShoppingItemCreate(
            name=ing.ingredient_name.strip(),
            category=recipe.cuisine or "General",
            quantity=qty_needed,
            unit=ing_unit,
            is_purchased=False,
            notes=notes,
            needs_review=needs_review,
            review_warning=review_warning,
            recipe_source_id=recipe.id
        )
        saved = create_shopping_item(db, user_id, item_in)
        added_items.append(saved)

    return added_items


# --- Shopping / Grocery Operations (Scoped to User) ---
def get_shopping_items(db: Session, user_id: int) -> List[models.ShoppingItem]:
    return db.query(models.ShoppingItem).filter(
        models.ShoppingItem.user_id == user_id
    ).order_by(models.ShoppingItem.is_purchased.asc(), models.ShoppingItem.created_at.desc()).all()

# Alias for backward compatibility
get_grocery_items = get_shopping_items

def create_shopping_item(db: Session, user_id: int, item_in: schemas.ShoppingItemCreate) -> models.ShoppingItem:
    clean_name = item_in.name.strip()
    norm_name = normalize_ingredient_name(clean_name)
    try:
        clean_unit = validate_and_normalize_unit(item_in.unit)
    except ValueError:
        clean_unit = item_in.unit.strip().lower()

    # Deduplicate normalized ingredient names for unpurchased items
    existing = db.query(models.ShoppingItem).filter(
        models.ShoppingItem.user_id == user_id,
        models.ShoppingItem.normalized_name == norm_name,
        models.ShoppingItem.is_purchased == False
    ).first()

    if existing:
        # Check unit compatibility
        if can_convert_units(clean_unit, existing.unit):
            converted = convert_unit_quantity(item_in.quantity, clean_unit, existing.unit)
            if converted is not None:
                existing.quantity = round(existing.quantity + converted, 2)
                if item_in.notes:
                    existing.notes = f"{existing.notes}; {item_in.notes}" if existing.notes else item_in.notes
                db.commit()
                db.refresh(existing)
                return existing

        # Incompatible units: preserve separate quantity notes and display review warning
        qty_str = f"{int(item_in.quantity)}" if item_in.quantity == int(item_in.quantity) else f"{item_in.quantity}"
        extra_note = f"+ {qty_str} {clean_unit}"
        if item_in.notes:
            extra_note += f" ({item_in.notes})"
        existing.notes = f"{existing.notes} {extra_note}".strip() if existing.notes else extra_note
        existing.needs_review = True
        existing.review_warning = (
            f"Contains entries with incompatible units ({existing.unit} and {clean_unit}). "
            "Accurate automatic aggregation impossible; review amounts before purchasing."
        )
        db.commit()
        db.refresh(existing)
        return existing

    # Create fresh shopping item
    item = models.ShoppingItem(
        user_id=user_id,
        name=clean_name,
        normalized_name=norm_name,
        category=item_in.category or "General",
        quantity=item_in.quantity,
        unit=clean_unit,
        is_purchased=item_in.is_purchased,
        notes=item_in.notes,
        needs_review=item_in.needs_review,
        review_warning=item_in.review_warning,
        recipe_source_id=item_in.recipe_source_id
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

create_grocery_item = create_shopping_item

def update_shopping_item(
    db: Session,
    user_id: int,
    item_id: int,
    item_in: schemas.ShoppingItemUpdate
) -> Optional[models.ShoppingItem]:
    item = db.query(models.ShoppingItem).filter(
        models.ShoppingItem.id == item_id,
        models.ShoppingItem.user_id == user_id
    ).first()
    if not item:
        return None

    if item_in.name is not None:
        item.name = item_in.name.strip()
        item.normalized_name = normalize_ingredient_name(item.name)
    if item_in.category is not None:
        item.category = item_in.category
    if item_in.quantity is not None:
        item.quantity = item_in.quantity
    if item_in.unit is not None:
        try:
            item.unit = validate_and_normalize_unit(item_in.unit)
        except ValueError:
            item.unit = item_in.unit.strip().lower()
    if item_in.is_purchased is not None:
        item.is_purchased = item_in.is_purchased
    if item_in.notes is not None:
        item.notes = item_in.notes
    if item_in.needs_review is not None:
        item.needs_review = item_in.needs_review
    if item_in.review_warning is not None:
        item.review_warning = item_in.review_warning

    db.commit()
    db.refresh(item)
    return item

def toggle_shopping_item(db: Session, user_id: int, item_id: int) -> Optional[models.ShoppingItem]:
    item = db.query(models.ShoppingItem).filter(
        models.ShoppingItem.id == item_id,
        models.ShoppingItem.user_id == user_id
    ).first()
    if not item:
        return None
    item.is_purchased = not item.is_purchased
    db.commit()
    db.refresh(item)
    return item

toggle_grocery_item = toggle_shopping_item

def delete_shopping_item(db: Session, user_id: int, item_id: int) -> bool:
    item = db.query(models.ShoppingItem).filter(
        models.ShoppingItem.id == item_id,
        models.ShoppingItem.user_id == user_id
    ).first()
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True

delete_grocery_item = delete_shopping_item

def move_purchased_to_pantry(
    db: Session,
    user_id: int,
    items_to_move: Optional[List[schemas.MovePurchasedItemIn]] = None
) -> int:
    """
    Moves purchased shopping items for user_id into their pantry_items.
    Uses transactions to avoid partial updates.
    """
    moved_count = 0
    try:
        if items_to_move:
            for itm in items_to_move:
                exp_date = None
                if itm.expiry_date and itm.expiry_date.strip():
                    try:
                        exp_date = date.fromisoformat(itm.expiry_date.strip())
                    except ValueError:
                        exp_date = None

                p_in = schemas.PantryItemCreate(
                    name=itm.name.strip(),
                    category="Other",
                    quantity=itm.quantity,
                    unit=itm.unit,
                    location=itm.location,
                    expiry_date=exp_date
                )
                create_pantry_item(db, user_id, p_in)

                if itm.shopping_item_id:
                    shop_item = db.query(models.ShoppingItem).filter(
                        models.ShoppingItem.id == itm.shopping_item_id,
                        models.ShoppingItem.user_id == user_id
                    ).first()
                    if shop_item:
                        db.delete(shop_item)
                moved_count += 1
        else:
            purchased = db.query(models.ShoppingItem).filter(
                models.ShoppingItem.user_id == user_id,
                models.ShoppingItem.is_purchased == True
            ).all()
            for g in purchased:
                loc = "Fridge" if (g.category or "") in ("Produce", "Dairy & Eggs", "Meat & Seafood", "Dairy") else "Pantry"
                p_in = schemas.PantryItemCreate(
                    name=g.name,
                    category=g.category or "Other",
                    quantity=g.quantity or 1.0,
                    unit=g.unit or "pcs",
                    location=loc
                )
                create_pantry_item(db, user_id, p_in)
                db.delete(g)
                moved_count += 1

        db.commit()
        return moved_count
    except Exception as e:
        db.rollback()
        raise e

def clear_purchased_shopping_items(db: Session, user_id: int) -> int:
    deleted = db.query(models.ShoppingItem).filter(
        models.ShoppingItem.user_id == user_id,
        models.ShoppingItem.is_purchased == True
    ).delete(synchronize_session=False)
    db.commit()
    return deleted

clear_purchased_groceries = clear_purchased_shopping_items


# --- Favorites Operations (Scoped to User) ---
def get_user_favorites(db: Session, user_id: int) -> List[schemas.FavoriteResponse]:
    favs = db.query(models.Favorite).filter(models.Favorite.user_id == user_id).all()
    res = []
    for f in favs:
        r_resp = None
        if f.recipe:
            r_resp = schemas.RecipeResponse(
                id=f.recipe.id,
                user_id=f.recipe.user_id,
                title=f.recipe.title,
                description=f.recipe.description,
                cuisine=f.recipe.cuisine,
                meal_type=f.recipe.meal_type,
                prep_time_minutes=f.recipe.prep_time_minutes,
                cook_time_minutes=f.recipe.cook_time_minutes,
                servings=f.recipe.servings,
                difficulty=f.recipe.difficulty,
                image_url=f.recipe.image_url,
                instructions=f.recipe.instructions,
                calories_per_serving=f.recipe.calories_per_serving,
                dietary_tags=f.recipe.dietary_tags,
                created_at=f.recipe.created_at,
                ingredients=[schemas.RecipeIngredientResponse.model_validate(i) for i in f.recipe.ingredients],
                is_favorite=True
            )
        res.append(
            schemas.FavoriteResponse(
                id=f.id,
                user_id=f.user_id,
                recipe_id=f.recipe_id,
                created_at=f.created_at,
                recipe=r_resp
            )
        )
    return res

def add_favorite(db: Session, user_id: int, recipe_id: int) -> models.Favorite:
    existing = db.query(models.Favorite).filter(
        models.Favorite.user_id == user_id,
        models.Favorite.recipe_id == recipe_id
    ).first()
    if existing:
        return existing
    fav = models.Favorite(user_id=user_id, recipe_id=recipe_id)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav

def remove_favorite(db: Session, user_id: int, recipe_id: int) -> bool:
    fav = db.query(models.Favorite).filter(
        models.Favorite.user_id == user_id,
        models.Favorite.recipe_id == recipe_id
    ).first()
    if not fav:
        return False
    db.delete(fav)
    db.commit()
    return True


# --- Meal Plan Operations (Scoped to User) ---
def get_meal_plans(
    db: Session,
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> List[schemas.MealPlanResponse]:
    query = db.query(models.MealPlan).filter(models.MealPlan.user_id == user_id)
    if start_date:
        query = query.filter(models.MealPlan.plan_date >= start_date)
    if end_date:
        query = query.filter(models.MealPlan.plan_date <= end_date)

    plans = query.order_by(models.MealPlan.plan_date.asc(), models.MealPlan.id.asc()).all()

    result = []
    for p in plans:
        r_resp = None
        if p.recipe:
            r = p.recipe
            r_resp = schemas.RecipeResponse(
                id=r.id,
                user_id=r.user_id,
                title=r.title,
                description=r.description,
                cuisine=r.cuisine,
                meal_type=r.meal_type,
                prep_time_minutes=r.prep_time_minutes,
                cook_time_minutes=r.cook_time_minutes,
                servings=r.servings,
                difficulty=r.difficulty,
                image_url=r.image_url,
                instructions=r.instructions,
                calories_per_serving=r.calories_per_serving,
                dietary_tags=r.dietary_tags,
                allergens=r.allergens,
                source=r.source,
                created_at=r.created_at,
                ingredients=[schemas.RecipeIngredientResponse.model_validate(i) for i in r.ingredients]
            )

        result.append(
            schemas.MealPlanResponse(
                id=p.id,
                user_id=p.user_id,
                plan_date=p.plan_date.isoformat() if p.plan_date else None,
                day_of_week=p.day_of_week,
                meal_slot=p.meal_slot,
                recipe_id=p.recipe_id,
                planned_servings=p.planned_servings or 2,
                custom_meal_name=p.custom_meal_name,
                notes=p.notes,
                recipe=r_resp,
                created_at=p.created_at
            )
        )
    return result

def create_meal_plan(db: Session, user_id: int, plan_in: schemas.MealPlanCreate) -> models.MealPlan:
    parsed_date = None
    if plan_in.plan_date and plan_in.plan_date.strip():
        try:
            parsed_date = date.fromisoformat(plan_in.plan_date.strip())
        except ValueError:
            parsed_date = date.today()
    else:
        parsed_date = date.today()

    day_of_week = plan_in.day_of_week or parsed_date.strftime("%A")
    slot = plan_in.meal_slot.strip().capitalize()

    # Check if a meal already exists at this date and slot
    existing = db.query(models.MealPlan).filter(
        models.MealPlan.user_id == user_id,
        models.MealPlan.plan_date == parsed_date,
        func.lower(models.MealPlan.meal_slot) == slot.lower()
    ).first()

    # Fallback check by day_of_week for legacy rows with plan_date = None
    if not existing and not plan_in.plan_date and plan_in.day_of_week:
        existing = db.query(models.MealPlan).filter(
            models.MealPlan.user_id == user_id,
            models.MealPlan.day_of_week == plan_in.day_of_week,
            func.lower(models.MealPlan.meal_slot) == slot.lower()
        ).first()

    if existing and not plan_in.replace_existing:
        existing_title = existing.recipe.title if existing.recipe else (existing.custom_meal_name or "Scheduled Meal")
        raise HTTPException(
            status_code=409,
            detail=f"Slot '{slot}' on {parsed_date.isoformat()} already has '{existing_title}'. Confirm replacement to overwrite."
        )

    if existing and plan_in.replace_existing:
        existing.recipe_id = plan_in.recipe_id
        existing.custom_meal_name = plan_in.custom_meal_name
        existing.planned_servings = plan_in.planned_servings
        existing.notes = plan_in.notes
        existing.day_of_week = day_of_week
        existing.plan_date = parsed_date
        db.commit()
        db.refresh(existing)
        return existing

    plan = models.MealPlan(
        user_id=user_id,
        plan_date=parsed_date,
        day_of_week=day_of_week,
        meal_slot=slot,
        recipe_id=plan_in.recipe_id,
        custom_meal_name=plan_in.custom_meal_name,
        planned_servings=plan_in.planned_servings,
        notes=plan_in.notes
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan

def update_meal_plan(
    db: Session,
    user_id: int,
    plan_id: int,
    plan_in: schemas.MealPlanUpdate
) -> Optional[models.MealPlan]:
    plan = db.query(models.MealPlan).filter(
        models.MealPlan.id == plan_id,
        models.MealPlan.user_id == user_id
    ).first()
    if not plan:
        return None

    if plan_in.planned_servings is not None:
        plan.planned_servings = plan_in.planned_servings
    if plan_in.custom_meal_name is not None:
        plan.custom_meal_name = plan_in.custom_meal_name
    if plan_in.notes is not None:
        plan.notes = plan_in.notes
    if plan_in.recipe_id is not None:
        plan.recipe_id = plan_in.recipe_id

    db.commit()
    db.refresh(plan)
    return plan

def delete_meal_plan(db: Session, user_id: int, plan_id: int) -> bool:
    plan = db.query(models.MealPlan).filter(
        models.MealPlan.id == plan_id,
        models.MealPlan.user_id == user_id
    ).first()
    if not plan:
        return False
    db.delete(plan)
    db.commit()
    return True

def generate_shopping_list_for_week(
    db: Session,
    user_id: int,
    start_date: date,
    end_date: date
) -> schemas.GenerateWeekShoppingResponse:
    """
    Generates a shopping list for the displayed week.
    Explains whether pantry quantities were subtracted accurately or only ingredient-name matching was used.
    Deduplicates normalized ingredient names, aggregates compatible units, and preserves notes.
    """
    plans = db.query(models.MealPlan).filter(
        models.MealPlan.user_id == user_id,
        models.MealPlan.plan_date >= start_date,
        models.MealPlan.plan_date <= end_date
    ).all()

    # Fallback to all plans if no date-bound plans exist (for legacy day_of_week entries)
    if not plans:
        plans = db.query(models.MealPlan).filter(models.MealPlan.user_id == user_id).all()

    today_dt = date.today()
    pantry_items = db.query(models.PantryItem).filter(
        models.PantryItem.user_id == user_id,
        models.PantryItem.quantity > 0
    ).all()
    non_expired_pantry = [p for p in pantry_items if not p.expiry_date or p.expiry_date >= today_dt]

    # Aggregate required ingredients across all planned meals
    aggregated: Dict[str, dict] = {}

    for plan in plans:
        if not plan.recipe:
            continue
        base_servings = plan.recipe.servings or 1
        scaler = (plan.planned_servings or base_servings) / base_servings

        for ing in plan.recipe.ingredients:
            if ing.is_optional:
                continue
            norm = normalize_ingredient_name(ing.ingredient_name)
            try:
                ing_unit = validate_and_normalize_unit(ing.unit)
            except ValueError:
                ing_unit = ing.unit.strip().lower()

            scaled_qty = ing.quantity * scaler

            if norm not in aggregated:
                aggregated[norm] = {
                    "name": ing.ingredient_name.strip(),
                    "total_needed": scaled_qty,
                    "unit": ing_unit,
                    "recipes": [f"{plan.recipe.title} ({plan.planned_servings} serv)"],
                    "incompatible_notes": []
                }
            else:
                curr = aggregated[norm]
                curr["recipes"].append(f"{plan.recipe.title} ({plan.planned_servings} serv)")
                if can_convert_units(ing_unit, curr["unit"]):
                    conv = convert_unit_quantity(scaled_qty, ing_unit, curr["unit"])
                    if conv is not None:
                        curr["total_needed"] += conv
                else:
                    curr["incompatible_notes"].append(f"+ {round(scaled_qty, 1)} {ing_unit}")

    # Compare against non-expired pantry stock
    explanations: List[schemas.WeekShoppingIngredientExplanation] = []
    items_to_create: List[schemas.ShoppingItemCreate] = []

    for norm, data in aggregated.items():
        needed_qty = round(data["total_needed"], 2)
        target_unit = data["unit"]
        matching_pantry = [
            p for p in non_expired_pantry
            if p.normalized_name == norm or ingredients_match(data["name"], p.name)
        ]

        pantry_amount_str = None
        pantry_subtracted_accurately = True
        needs_review = bool(data["incompatible_notes"])
        review_warning = None
        explanation = ""
        final_buy_qty = needed_qty

        if data["incompatible_notes"]:
            review_warning = (
                f"Multiple recipes in week use incompatible units ({target_unit} and {', '.join(data['incompatible_notes'])}). "
                "Review total amount."
            )

        if matching_pantry:
            pantry_summary = ", ".join(f"{p.quantity} {p.unit} ({p.location})" for p in matching_pantry)
            pantry_amount_str = pantry_summary

            can_convert = all(can_convert_units(p.unit, target_unit) for p in matching_pantry)
            if can_convert:
                total_pantry = sum(
                    convert_unit_quantity(p.quantity, p.unit, target_unit) or 0.0
                    for p in matching_pantry
                )
                if total_pantry >= needed_qty:
                    final_buy_qty = 0.0
                    pantry_subtracted_accurately = True
                    explanation = (
                        f"Accurately subtracted {needed_qty} {target_unit} from available pantry stock "
                        f"({round(total_pantry, 1)} {target_unit} on hand). Sufficient stock; not added to shopping list."
                    )
                else:
                    final_buy_qty = round(needed_qty - total_pantry, 2)
                    pantry_subtracted_accurately = True
                    explanation = (
                        f"Accurately subtracted {round(total_pantry, 1)} {target_unit} from available pantry stock "
                        f"({round(total_pantry, 1)} {target_unit} on hand). Remaining {final_buy_qty} {target_unit} needed."
                    )
            else:
                # Incompatible units! Do NOT silently assume pantry quantities are sufficient.
                pantry_subtracted_accurately = False
                needs_review = True
                review_warning = (
                    f"Pantry stock has {pantry_summary}, but weekly meals require {needed_qty} {target_unit}. "
                    "Units cannot be safely converted without density assumptions."
                )
                final_buy_qty = needed_qty
                explanation = (
                    f"Ingredient-name matched '{data['name']}', but units ({pantry_summary} vs {target_unit}) "
                    f"could not be safely converted without density assumptions. Subtracted 0; added {final_buy_qty} {target_unit} for review."
                )
        else:
            pantry_subtracted_accurately = True
            explanation = f"No non-expired stock of '{data['name']}' found in pantry. Full amount ({final_buy_qty} {target_unit}) added to shopping list."

        explanations.append(
            schemas.WeekShoppingIngredientExplanation(
                ingredient_name=data["name"],
                normalized_name=norm,
                total_needed=needed_qty,
                unit=target_unit,
                pantry_amount_found=pantry_amount_str,
                pantry_subtracted_accurately=pantry_subtracted_accurately,
                final_shopping_quantity=final_buy_qty,
                needs_review=needs_review,
                review_warning=review_warning,
                explanation=explanation
            )
        )

        if final_buy_qty > 0 or needs_review:
            note = f"For week of {start_date.isoformat()}: {', '.join(data['recipes'])}"
            if data["incompatible_notes"]:
                note += f" {' '.join(data['incompatible_notes'])}"
            items_to_create.append(
                schemas.ShoppingItemCreate(
                    name=data["name"],
                    category="Produce" if any(w in data["name"].lower() for w in ["onion", "garlic", "tomato", "spinach", "basil", "lemon", "apple", "banana"]) else "General",
                    quantity=final_buy_qty,
                    unit=target_unit,
                    is_purchased=False,
                    notes=note,
                    needs_review=needs_review,
                    review_warning=review_warning
                )
            )

    count = 0
    for itm in items_to_create:
        create_shopping_item(db, user_id, itm)
        count += 1

    current_shopping = get_shopping_items(db, user_id)

    return schemas.GenerateWeekShoppingResponse(
        message=f"Generated shopping list for {len(plans)} planned meal(s) across the week.",
        planned_meals_count=len(plans),
        items_added_or_updated=count,
        explanations=explanations,
        shopping_items=[schemas.ShoppingItemResponse.model_validate(s) for s in current_shopping]
    )

def generate_grocery_from_meal_plans(db: Session, user_id: int) -> int:
    today_dt = date.today()
    start_of_week = today_dt - timedelta(days=today_dt.weekday())
    end_of_week = start_of_week + timedelta(days=6)
    res = generate_shopping_list_for_week(db, user_id, start_of_week, end_of_week)
    return res.items_added_or_updated


# --- Stats Operations (Scoped to User) ---
def get_pantry_stats(db: Session, user_id: int) -> schemas.StatsResponse:
    pantry_items = db.query(models.PantryItem).filter(models.PantryItem.user_id == user_id).all()
    total_items = len(pantry_items)
    
    expiring_soon = 0
    expired = 0
    low_stock = 0

    for item in pantry_items:
        _, status, _ = calculate_freshness(item.expiry_date)
        if status in ("due_today", "due_within_three_days", "expiring_soon"):
            expiring_soon += 1
        elif status in ("date_passed", "expired"):
            expired += 1
        if item.is_low_stock or item.quantity <= 1.0:
            low_stock += 1

    matches = match_recipes_against_pantry(db, user_id=user_id)
    total_recipes = len(matches)
    ready_count = sum(1 for m in matches if m.can_cook_now)
    missing_one = sum(1 for m in matches if m.missing_count == 1)

    # Health score: 0 to 100 based on freshness ratio
    if total_items == 0:
        health_score = 50
    else:
        penalty = (expired * 25) + (expiring_soon * 10)
        health_score = max(10, min(100, 100 - penalty + min(20, ready_count * 5)))

    return schemas.StatsResponse(
        total_pantry_items=total_items,
        items_expiring_soon=expiring_soon,
        items_expired=expired,
        total_recipes=total_recipes,
        ready_to_cook_count=ready_count,
        recipes_missing_one=missing_one,
        low_stock_count=low_stock,
        pantry_health_score=health_score
    )


# --- User Profile & Safe Data Export Operations ---
def update_user_profile(
    db: Session,
    user_id: int,
    profile_in: schemas.UserProfileUpdateRequest
) -> models.User:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise ValueError("User not found.")

    if profile_in.email is not None:
        new_email = profile_in.email.strip().lower()
        if new_email != user.email:
            existing = db.query(models.User).filter(models.User.email == new_email).first()
            if existing and existing.id != user_id:
                raise ValueError("Email is already in use by another account.")
            user.email = new_email

    if profile_in.name is not None:
        user.name = profile_in.name.strip()

    if profile_in.theme_preference is not None:
        if profile_in.theme_preference in ("light", "dark", "system"):
            user.theme_preference = profile_in.theme_preference

    if profile_in.dietary_preferences is not None:
        user.dietary_preferences = profile_in.dietary_preferences.strip()

    if profile_in.preferred_unit is not None:
        if profile_in.preferred_unit in ("metric", "imperial"):
            user.preferred_unit = profile_in.preferred_unit

    if profile_in.new_password is not None:
        if not profile_in.current_password:
            raise ValueError("Current password is required to set a new password.")
        if not verify_password(profile_in.current_password, user.hashed_password):
            raise ValueError("Current password is incorrect.")
        user.hashed_password = hash_password(profile_in.new_password)

    db.commit()
    db.refresh(user)
    return user


def export_user_data(db: Session, user_id: int) -> Dict[str, Any]:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise ValueError("User not found.")

    pantry_items = get_pantry_items(db, user_id)
    shopping_items = get_shopping_items(db, user_id)
    meal_plans = get_meal_plans(db, user_id)
    favorites = get_user_favorites(db, user_id)

    # Strictly serialize through safe Pydantic schemas (omitting passwords and sessions)
    safe_user = schemas.UserResponse.model_validate(user)
    safe_pantry = [schemas.PantryItemResponse.model_validate(p) for p in pantry_items]
    safe_shopping = [schemas.ShoppingItemResponse.model_validate(s) for s in shopping_items]

    return {
        "export_version": "1.0",
        "exported_at": datetime.now(timezone.utc),
        "user": safe_user,
        "pantry_items": safe_pantry,
        "shopping_items": safe_shopping,
        "meal_plans": meal_plans,
        "favorites": favorites,
        "summary": {
            "total_pantry_items": len(pantry_items),
            "total_shopping_items": len(shopping_items),
            "total_meal_plans": len(meal_plans),
            "total_favorites": len(favorites),
        }
    }


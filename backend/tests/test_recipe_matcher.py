import pytest
import json
from datetime import date, timedelta
from app import models, schemas, crud
from app.normalization import (
    can_convert_units,
    convert_unit_quantity,
    get_unit_dimension
)

def test_seeded_recipes_count_and_stable_ids(db_session):
    """
    Verifies at least 20 varied recipes are seeded with stable IDs,
    instructions, preparation/cooking times, servings, and dietary tags.
    """
    from app.seed_data import seed_initial_data
    seed_initial_data(db_session)

    recipes = db_session.query(models.Recipe).all()
    assert len(recipes) >= 20, f"Expected at least 20 seeded recipes, found {len(recipes)}"

    # Check stable IDs 1 through 20+
    ids = [r.id for r in recipes]
    for expected_id in range(1, 21):
        assert expected_id in ids, f"Expected stable ID {expected_id} in seeded recipes"

    # Verify each recipe has required attributes
    for r in recipes:
        assert r.title, "Recipe must have a title"
        assert r.servings > 0, "Recipe servings must be positive"
        assert r.prep_time_minutes >= 0, "Prep time must be >= 0"
        assert r.cook_time_minutes >= 0, "Cook time must be >= 0"
        assert len(r.ingredients) > 0, f"Recipe {r.title} must have ingredients"
        assert r.source == "sample", "Seeded recipes must have source 'sample'"
        # Check instructions can be parsed
        instructions = json.loads(r.instructions)
        assert isinstance(instructions, list)
        assert len(instructions) > 0


def test_allergens_documented_without_certified_claims(db_session):
    """
    Verifies allergens are clearly identified where known based on ingredients,
    avoiding claims of certified allergen safety.
    """
    from app.seed_data import seed_initial_data
    seed_initial_data(db_session)

    carbonara = db_session.query(models.Recipe).filter(models.Recipe.id == 2).first()
    assert "Eggs" in carbonara.allergens
    assert "Gluten" in carbonara.allergens

    dahl = db_session.query(models.Recipe).filter(models.Recipe.id == 3).first()
    assert "None reported" in dahl.allergens or not dahl.allergens


def test_unit_conversion_strict_rules():
    """
    Verifies that unit conversions are valid within weight or volume,
    and volume-to-weight conversions are strictly NOT assumed.
    """
    # Weight to weight
    assert can_convert_units("kg", "g") is True
    assert convert_unit_quantity(1.5, "kg", "g") == 1500.0
    assert convert_unit_quantity(500, "g", "kg") == 0.5
    assert can_convert_units("oz", "g") is True

    # Volume to volume
    assert can_convert_units("l", "ml") is True
    assert convert_unit_quantity(1.0, "l", "ml") == 1000.0
    assert can_convert_units("tbsp", "cups") is True
    assert convert_unit_quantity(16, "tbsp", "cups") == 1.0  # 16 tbsp = 1 cup

    # Volume to weight: STRICTLY PROHIBITED (no density assumed!)
    assert can_convert_units("cup", "g") is False
    assert convert_unit_quantity(1.0, "cup", "g") is None
    assert can_convert_units("ml", "g") is False
    assert convert_unit_quantity(250.0, "ml", "g") is None
    assert can_convert_units("tbsp", "oz") is False


def test_base_match_score_formula(db_session, fresh_user):
    """
    Base match score formula:
    Available non-expired ingredient types divided by total required ingredient types, multiplied by 100.
    """
    # Create custom recipe with 4 required ingredients and 1 optional
    recipe = models.Recipe(
        user_id=fresh_user.id,
        title="Formula Test Dish",
        cuisine="Test",
        meal_type="Dinner",
        prep_time_minutes=5,
        cook_time_minutes=15,
        servings=2,
        instructions=json.dumps(["Step 1"]),
        dietary_tags=""
    )
    db_session.add(recipe)
    db_session.flush()

    db_session.add(models.RecipeIngredient(recipe_id=recipe.id, ingredient_name="Flour", quantity=200, unit="g", is_optional=False))
    db_session.add(models.RecipeIngredient(recipe_id=recipe.id, ingredient_name="Sugar", quantity=100, unit="g", is_optional=False))
    db_session.add(models.RecipeIngredient(recipe_id=recipe.id, ingredient_name="Eggs", quantity=2, unit="pcs", is_optional=False))
    db_session.add(models.RecipeIngredient(recipe_id=recipe.id, ingredient_name="Butter", quantity=50, unit="g", is_optional=False))
    db_session.add(models.RecipeIngredient(recipe_id=recipe.id, ingredient_name="Vanilla", quantity=1, unit="tsp", is_optional=True))
    db_session.commit()

    # User pantry has 3 of the 4 required (Flour, Sugar, Eggs), Butter is missing
    db_session.add(models.PantryItem(user_id=fresh_user.id, name="Flour", quantity=500, unit="g"))
    db_session.add(models.PantryItem(user_id=fresh_user.id, name="Sugar", quantity=500, unit="g"))
    db_session.add(models.PantryItem(user_id=fresh_user.id, name="Eggs", quantity=6, unit="pcs"))
    db_session.commit()

    matches = crud.match_recipes_against_pantry(db_session, user_id=fresh_user.id, search="Formula Test Dish")
    assert len(matches) == 1
    m = matches[0]
    # 3 available / 4 required = 75.0%
    assert m.match_percentage == 75.0
    assert m.matched_ingredients_count == 3
    assert m.total_essential_ingredients == 4
    assert m.missing_count == 1
    assert "Butter" in m.missing_ingredients
    assert "Flour" in m.available_ingredients
    assert "Eggs" in m.available_ingredients
    assert m.readiness_status == "missing_ingredients"
    assert m.can_cook_now is False


def test_ready_to_cook_vs_types_available_volume_to_weight(db_session, fresh_user):
    """
    Do not label a recipe "ready to cook" unless quantities can be checked reliably.
    Otherwise say "all ingredient types available."
    """
    # Recipe requires weight (g)
    recipe = models.Recipe(
        user_id=fresh_user.id,
        title="Volume vs Weight Test",
        instructions=json.dumps(["Mix"]),
        cook_time_minutes=10,
        prep_time_minutes=5,
        servings=2
    )
    db_session.add(recipe)
    db_session.flush()
    db_session.add(models.RecipeIngredient(recipe_id=recipe.id, ingredient_name="Flour", quantity=200, unit="g", is_optional=False))
    db_session.commit()

    # Case 1: Pantry has Flour in 'cups' (volume, cannot reliably check quantity against 'g')
    item = models.PantryItem(user_id=fresh_user.id, name="Flour", quantity=2.0, unit="cups")
    db_session.add(item)
    db_session.commit()

    matches = crud.match_recipes_against_pantry(db_session, user_id=fresh_user.id, search="Volume vs Weight Test")
    assert len(matches) == 1
    m = matches[0]
    assert m.match_percentage == 100.0
    assert m.missing_count == 0
    # Must NOT be labeled ready to cook because units cannot be reliably converted
    assert m.can_cook_now is False
    assert m.readiness_status == "types_available"
    assert m.readiness_label == "All ingredient types available"

    # Case 2: Pantry has Flour in 'kg' (weight, can reliably convert: 0.5kg = 500g >= 200g)
    db_session.delete(item)
    item_kg = models.PantryItem(user_id=fresh_user.id, name="Flour", quantity=0.5, unit="kg")
    db_session.add(item_kg)
    db_session.commit()

    matches = crud.match_recipes_against_pantry(db_session, user_id=fresh_user.id, search="Volume vs Weight Test")
    m2 = matches[0]
    assert m2.match_percentage == 100.0
    assert m2.can_cook_now is True
    assert m2.readiness_status == "ready_to_cook"
    assert m2.readiness_label == "Ready to cook"

    # Case 3: Pantry has Flour in 'g' but insufficient quantity (50g < 200g)
    db_session.delete(item_kg)
    item_low = models.PantryItem(user_id=fresh_user.id, name="Flour", quantity=50.0, unit="g")
    db_session.add(item_low)
    db_session.commit()

    matches = crud.match_recipes_against_pantry(db_session, user_id=fresh_user.id, search="Volume vs Weight Test")
    m3 = matches[0]
    assert m3.match_percentage == 100.0
    assert m3.can_cook_now is False
    assert m3.readiness_status == "insufficient_quantity"
    assert m3.readiness_label == "Insufficient quantity"


def test_deterministic_ranking_order(db_session, fresh_user):
    """
    Rank first by match score, then by use-soon ingredients, then by cooking time.
    """
    today = date.today()
    soon = today + timedelta(days=2)
    fresh = today + timedelta(days=20)

    # Ingredients in pantry:
    # Chicken Breast (expires soon!)
    # Garlic (fresh)
    # Eggs (fresh)
    db_session.add(models.PantryItem(user_id=fresh_user.id, name="Chicken Breast", quantity=500, unit="g", expiry_date=soon))
    db_session.add(models.PantryItem(user_id=fresh_user.id, name="Garlic", quantity=5, unit="cloves", expiry_date=fresh))
    db_session.add(models.PantryItem(user_id=fresh_user.id, name="Eggs", quantity=6, unit="pcs", expiry_date=fresh))
    db_session.commit()

    # Recipe A: 100% match, rescues 1 expiring (Chicken Breast), cook time 25 min
    rA = models.Recipe(id=101, user_id=fresh_user.id, title="Rank Dish A", cook_time_minutes=25, prep_time_minutes=5, instructions="[]")
    db_session.add(rA)
    db_session.flush()
    db_session.add(models.RecipeIngredient(recipe_id=rA.id, ingredient_name="Chicken Breast", quantity=400, unit="g"))

    # Recipe B: 100% match, rescues 0 expiring (Garlic only), cook time 10 min
    rB = models.Recipe(id=102, user_id=fresh_user.id, title="Rank Dish B", cook_time_minutes=10, prep_time_minutes=5, instructions="[]")
    db_session.add(rB)
    db_session.flush()
    db_session.add(models.RecipeIngredient(recipe_id=rB.id, ingredient_name="Garlic", quantity=2, unit="cloves"))

    # Recipe C: 100% match, rescues 1 expiring (Chicken Breast + Garlic), cook time 15 min (faster than A)
    rC = models.Recipe(id=103, user_id=fresh_user.id, title="Rank Dish C", cook_time_minutes=15, prep_time_minutes=5, instructions="[]")
    db_session.add(rC)
    db_session.flush()
    db_session.add(models.RecipeIngredient(recipe_id=rC.id, ingredient_name="Chicken Breast", quantity=400, unit="g"))
    db_session.add(models.RecipeIngredient(recipe_id=rC.id, ingredient_name="Garlic", quantity=2, unit="cloves"))

    # Recipe D: 50% match (has Eggs, missing Bacon)
    rD = models.Recipe(id=104, user_id=fresh_user.id, title="Rank Dish D", cook_time_minutes=5, prep_time_minutes=5, instructions="[]")
    db_session.add(rD)
    db_session.flush()
    db_session.add(models.RecipeIngredient(recipe_id=rD.id, ingredient_name="Eggs", quantity=2, unit="pcs"))
    db_session.add(models.RecipeIngredient(recipe_id=rD.id, ingredient_name="Bacon", quantity=100, unit="g"))

    db_session.commit()

    results = crud.match_recipes_against_pantry(
        db_session,
        user_id=fresh_user.id,
        search="Rank Dish "
    )

    titles = [r.title for r in results]

    # Between C and A (both 100% match, both rescue 1 expiring): C has cook_time 15 < A cook_time 25.
    # Dish B is 100% match but rescues 0 expiring, so C and A rank before B!
    # Dish D is 50% match, ranks last!
    assert titles[0] == "Rank Dish C", f"Rank Dish C should rank 1st (100% match, rescues expiring, faster time). Got: {titles}"
    assert titles[1] == "Rank Dish A", f"Rank Dish A should rank 2nd (100% match, rescues expiring). Got: {titles}"
    assert titles[2] == "Rank Dish B", f"Rank Dish B should rank 3rd (100% match, 0 expiring). Got: {titles}"
    assert titles[3] == "Rank Dish D", f"Rank Dish D should rank 4th (50% match). Got: {titles}"


def test_vegan_included_in_vegetarian_results(db_session, fresh_user):
    """
    Include vegan recipes in vegetarian results.
    """
    r_veg = models.Recipe(
        user_id=fresh_user.id,
        title="Pure Vegetarian Dish",
        dietary_tags="Vegetarian",
        instructions="[]"
    )
    r_vegan = models.Recipe(
        user_id=fresh_user.id,
        title="Pure Vegan Dish",
        dietary_tags="Vegan,Dairy-Free",
        instructions="[]"
    )
    r_meat = models.Recipe(
        user_id=fresh_user.id,
        title="Carnivore Dish",
        dietary_tags="High-Protein",
        instructions="[]"
    )
    db_session.add_all([r_veg, r_vegan, r_meat])
    db_session.commit()

    # Filter Vegetarian
    veg_results = crud.match_recipes_against_pantry(
        db_session,
        user_id=fresh_user.id,
        dietary_tag="Vegetarian"
    )
    veg_titles = [r.title for r in veg_results]
    assert "Pure Vegetarian Dish" in veg_titles
    assert "Pure Vegan Dish" in veg_titles, "Vegan dish MUST be included in Vegetarian results!"
    assert "Carnivore Dish" not in veg_titles


def test_saved_recipes_filter(db_session, fresh_user):
    """
    Filter only bookmarked/saved recipes.
    """
    r1 = models.Recipe(user_id=fresh_user.id, title="Favorite One", instructions="[]")
    r2 = models.Recipe(user_id=fresh_user.id, title="Regular Two", instructions="[]")
    db_session.add_all([r1, r2])
    db_session.commit()

    # Favorite r1
    crud.add_favorite(db_session, user_id=fresh_user.id, recipe_id=r1.id)

    saved_results = crud.match_recipes_against_pantry(
        db_session,
        user_id=fresh_user.id,
        only_saved=True
    )
    saved_titles = [r.title for r in saved_results]
    assert "Favorite One" in saved_titles
    assert "Regular Two" not in saved_titles

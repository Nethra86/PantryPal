import pytest
from datetime import date, timedelta
from app import crud, schemas, models

@pytest.fixture(autouse=True)
def clean_user_state(db, test_user):
    db.query(models.ShoppingItem).filter(models.ShoppingItem.user_id == test_user.id).delete()
    db.query(models.MealPlan).filter(models.MealPlan.user_id == test_user.id).delete()
    db.query(models.PantryItem).filter(models.PantryItem.user_id == test_user.id).delete()
    db.commit()
    yield

def test_shopping_manual_addition_deduplication_and_compatible_aggregation(db, test_user):
    # 1. Add 200 g Garlic
    item1 = schemas.ShoppingItemCreate(
        name="Fresh Garlic",
        quantity=200,
        unit="g",
        category="Produce"
    )
    res1 = crud.create_shopping_item(db, test_user.id, item1)
    assert res1.normalized_name == "garlic"
    assert res1.quantity == 200
    assert res1.unit == "g"
    assert not res1.needs_review

    # 2. Add 300 g Garlic (compatible unit) -> should aggregate to 500 g
    item2 = schemas.ShoppingItemCreate(
        name="Garlic",
        quantity=300,
        unit="g",
        category="Produce"
    )
    res2 = crud.create_shopping_item(db, test_user.id, item2)
    assert res2.id == res1.id
    assert res2.quantity == 500
    assert res2.unit == "g"
    assert not res2.needs_review

def test_shopping_incompatible_units_preserves_notes_and_warns(db, test_user):
    # 1. Add 200 g All-Purpose Flour
    item1 = schemas.ShoppingItemCreate(
        name="All-Purpose Flour",
        quantity=200,
        unit="g",
        category="Baking"
    )
    res1 = crud.create_shopping_item(db, test_user.id, item1)
    assert res1.normalized_name == "flour"
    assert res1.quantity == 200

    # 2. Add 2 cups Flour (incompatible unit: volume vs weight)
    item2 = schemas.ShoppingItemCreate(
        name="Flour",
        quantity=2,
        unit="cups",
        category="Baking"
    )
    res2 = crud.create_shopping_item(db, test_user.id, item2)
    assert res2.id == res1.id
    assert res2.quantity == 200  # Quantity preserved without guessing density!
    assert "2 cups" in res2.notes
    assert res2.needs_review is True
    assert "incompatible units" in res2.review_warning.lower()

def test_shopping_update_toggle_delete_and_clear(db, test_user):
    item = crud.create_shopping_item(
        db, test_user.id,
        schemas.ShoppingItemCreate(name="Almond Milk", quantity=1, unit="l", category="Dairy")
    )
    assert item.is_purchased is False

    # Update item
    updated = crud.update_shopping_item(
        db, test_user.id, item.id,
        schemas.ShoppingItemUpdate(quantity=2.0, notes="Unsweetened preferred")
    )
    assert updated.quantity == 2.0
    assert updated.notes == "Unsweetened preferred"

    # Toggle purchased checkbox
    toggled = crud.toggle_shopping_item(db, test_user.id, item.id)
    assert toggled.is_purchased is True

    # Clear purchased items
    cleared_count = crud.clear_purchased_shopping_items(db, test_user.id)
    assert cleared_count == 1
    items = crud.get_shopping_items(db, test_user.id)
    assert len(items) == 0

def test_move_purchased_to_pantry_explicit_transactional_flow(db, test_user):
    # Create 2 purchased shopping items
    item1 = crud.create_shopping_item(
        db, test_user.id,
        schemas.ShoppingItemCreate(name="Greek Yogurt", quantity=500, unit="g", is_purchased=True)
    )
    item2 = crud.create_shopping_item(
        db, test_user.id,
        schemas.ShoppingItemCreate(name="Pasta Sauce", quantity=1, unit="cans", is_purchased=True)
    )

    # Move with explicit details (storage location & optional expiry date)
    tomorrow_str = (date.today() + timedelta(days=10)).isoformat()
    explicit_items = [
        schemas.MovePurchasedItemIn(
            shopping_item_id=item1.id,
            name="Greek Yogurt",
            quantity=500,
            unit="g",
            location="Fridge",
            expiry_date=tomorrow_str
        ),
        schemas.MovePurchasedItemIn(
            shopping_item_id=item2.id,
            name="Pasta Sauce",
            quantity=1,
            unit="cans",
            location="Pantry",
            expiry_date=None
        ),
    ]

    moved_count = crud.move_purchased_to_pantry(db, test_user.id, items_to_move=explicit_items)
    assert moved_count == 2

    # Verify shopping list is cleared of moved items
    rem_shopping = crud.get_shopping_items(db, test_user.id)
    assert len(rem_shopping) == 0

    # Verify pantry now contains both items with correct attributes
    pantry = crud.get_pantry_items(db, test_user.id)
    yogurt = next((p for p in pantry if p.name == "Greek Yogurt"), None)
    assert yogurt is not None
    assert yogurt.location == "Fridge"
    assert yogurt.quantity == 500
    assert yogurt.unit == "g"
    assert yogurt.expiry_date == date.fromisoformat(tomorrow_str)

    sauce = next((p for p in pantry if p.name == "Pasta Sauce"), None)
    assert sauce is not None
    assert sauce.location == "Pantry"
    assert sauce.quantity == 1
    assert sauce.unit in ("can", "cans")

def test_meal_planner_date_based_slots_and_servings(db, test_user):
    # Seed a sample recipe if needed
    recipes = db.query(models.Recipe).all()
    assert len(recipes) > 0
    sample_recipe = recipes[0]

    plan_date_str = date.today().isoformat()

    # 1. Add meal to Breakfast slot with 4 planned servings
    plan = crud.create_meal_plan(
        db, test_user.id,
        schemas.MealPlanCreate(
            plan_date=plan_date_str,
            meal_slot="Breakfast",
            recipe_id=sample_recipe.id,
            planned_servings=4,
            notes="Weekend brunch"
        )
    )
    assert plan.planned_servings == 4
    assert plan.meal_slot == "Breakfast"
    assert plan.plan_date == date.today()

    # 2. Adding to occupied slot without replace_existing must raise 409 Conflict
    with pytest.raises(Exception) as excinfo:
        crud.create_meal_plan(
            db, test_user.id,
            schemas.MealPlanCreate(
                plan_date=plan_date_str,
                meal_slot="Breakfast",
                recipe_id=sample_recipe.id,
                planned_servings=2,
                replace_existing=False
            )
        )
    assert "already has" in str(excinfo.value).lower() or "conflict" in str(excinfo.value).lower()

    # 3. Adding to occupied slot with replace_existing=True overwrites slot
    overwritten = crud.create_meal_plan(
        db, test_user.id,
        schemas.MealPlanCreate(
            plan_date=plan_date_str,
            meal_slot="Breakfast",
            recipe_id=sample_recipe.id,
            planned_servings=3,
            notes="Updated brunch",
            replace_existing=True
        )
    )
    assert overwritten.id == plan.id
    assert overwritten.planned_servings == 3
    assert overwritten.notes == "Updated brunch"

    # 4. Support Breakfast, Lunch, Dinner, and Snack slots
    for slot in ["Lunch", "Dinner", "Snack"]:
        slot_plan = crud.create_meal_plan(
            db, test_user.id,
            schemas.MealPlanCreate(
                plan_date=plan_date_str,
                meal_slot=slot,
                recipe_id=sample_recipe.id,
                planned_servings=2
            )
        )
        assert slot_plan.meal_slot == slot

    # Query plans for today
    plans = crud.get_meal_plans(db, test_user.id, start_date=date.today(), end_date=date.today())
    assert len(plans) == 4

def test_generate_weekly_shopping_list_with_subtraction_explanations(db, test_user):
    # Find a recipe with known ingredients, e.g. Chickpea Shakshuka or Pancakes
    recipe = db.query(models.Recipe).filter(models.Recipe.title.contains("Pancakes")).first()
    if not recipe:
        recipe = db.query(models.Recipe).first()

    today_dt = date.today()
    start_week = today_dt
    end_week = today_dt + timedelta(days=6)

    # Clear prior shopping and meal plans for test user
    db.query(models.ShoppingItem).filter(models.ShoppingItem.user_id == test_user.id).delete()
    db.query(models.MealPlan).filter(models.MealPlan.user_id == test_user.id).delete()
    db.query(models.PantryItem).filter(models.PantryItem.user_id == test_user.id).delete()
    db.commit()

    # Add 100 g Flour to pantry (pancake recipe requires 250 g for 4 servings)
    crud.create_pantry_item(
        db, test_user.id,
        schemas.PantryItemCreate(
            name="Flour",
            quantity=100,
            unit="g",
            location="Pantry"
        )
    )

    # Schedule Pancake meal for Breakfast (4 servings)
    crud.create_meal_plan(
        db, test_user.id,
        schemas.MealPlanCreate(
            plan_date=today_dt.isoformat(),
            meal_slot="Breakfast",
            recipe_id=recipe.id,
            planned_servings=4
        )
    )

    # Generate shopping list for the week
    res = crud.generate_shopping_list_for_week(db, test_user.id, start_week, end_week)
    assert res.planned_meals_count >= 1
    assert len(res.explanations) > 0

    # Flour explanation should state that 100 g was accurately subtracted from pantry stock
    flour_exp = next((e for e in res.explanations if "flour" in e.normalized_name), None)
    if flour_exp:
        assert flour_exp.pantry_subtracted_accurately is True
        assert "accurately subtracted" in flour_exp.explanation.lower()
        # 200g recipe needed - 100g in pantry = 100g to buy
        assert flour_exp.final_shopping_quantity == 100.0

    # Verify persistent shopping list items were created
    items = crud.get_shopping_items(db, test_user.id)
    assert len(items) > 0
    shop_flour = next((i for i in items if i.normalized_name == "flour"), None)
    if shop_flour:
        assert shop_flour.quantity == 100.0

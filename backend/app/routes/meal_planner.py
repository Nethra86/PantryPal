from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import schemas, crud, models
from app.auth import get_current_user, verify_csrf

router = APIRouter(prefix="/meal-plan", tags=["Weekly Meal Planner"])

@router.get("", response_model=List[schemas.MealPlanResponse])
def get_meal_plans(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    s_date = None
    e_date = None
    if start_date:
        try:
            s_date = date.fromisoformat(start_date.strip())
        except ValueError:
            pass
    if end_date:
        try:
            e_date = date.fromisoformat(end_date.strip())
        except ValueError:
            pass

    return crud.get_meal_plans(db, user_id=current_user.id, start_date=s_date, end_date=e_date)

@router.post("", response_model=schemas.MealPlanResponse, status_code=status.HTTP_201_CREATED)
def assign_meal_plan(
    plan_in: schemas.MealPlanCreate,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    if plan_in.recipe_id:
        recipe = crud.get_recipe_by_id(db, plan_in.recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")

    created = crud.create_meal_plan(db, user_id=current_user.id, plan_in=plan_in)

    r_resp = None
    if created.recipe:
        r = created.recipe
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

    return schemas.MealPlanResponse(
        id=created.id,
        user_id=created.user_id,
        plan_date=created.plan_date.isoformat() if created.plan_date else None,
        day_of_week=created.day_of_week,
        meal_slot=created.meal_slot,
        recipe_id=created.recipe_id,
        planned_servings=created.planned_servings or 2,
        custom_meal_name=created.custom_meal_name,
        notes=created.notes,
        recipe=r_resp,
        created_at=created.created_at
    )

@router.put("/{plan_id}", response_model=schemas.MealPlanResponse)
@router.patch("/{plan_id}", response_model=schemas.MealPlanResponse)
def update_meal_plan(
    plan_id: int,
    plan_in: schemas.MealPlanUpdate,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    updated = crud.update_meal_plan(db, user_id=current_user.id, plan_id=plan_id, plan_in=plan_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Meal plan entry not found")

    r_resp = None
    if updated.recipe:
        r = updated.recipe
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

    return schemas.MealPlanResponse(
        id=updated.id,
        user_id=updated.user_id,
        plan_date=updated.plan_date.isoformat() if updated.plan_date else None,
        day_of_week=updated.day_of_week,
        meal_slot=updated.meal_slot,
        recipe_id=updated.recipe_id,
        planned_servings=updated.planned_servings or 2,
        custom_meal_name=updated.custom_meal_name,
        notes=updated.notes,
        recipe=r_resp,
        created_at=updated.created_at
    )

@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_meal_plan(
    plan_id: int,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    success = crud.delete_meal_plan(db, user_id=current_user.id, plan_id=plan_id)
    if not success:
        raise HTTPException(status_code=404, detail="Meal plan entry not found")
    return None

@router.post("/generate-shopping-list", response_model=schemas.GenerateWeekShoppingResponse)
def generate_shopping_list_for_week(
    req: schemas.GenerateWeekShoppingRequest,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    try:
        s_date = date.fromisoformat(req.start_date.strip())
        e_date = date.fromisoformat(req.end_date.strip())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    return crud.generate_shopping_list_for_week(db, user_id=current_user.id, start_date=s_date, end_date=e_date)

@router.post("/generate-grocery")
def generate_grocery_from_meal_plan(
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    added_count = crud.generate_grocery_from_meal_plans(db, user_id=current_user.id)
    return {
        "message": f"Added {added_count} items from weekly meal plan to your shopping list!",
        "added_count": added_count
    }

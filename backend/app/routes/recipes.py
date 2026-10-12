from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import schemas, crud, models
from app.auth import get_current_user, verify_csrf

router = APIRouter(prefix="/recipes", tags=["Recipes & Smart Matching"])

@router.get("", response_model=List[schemas.RecipeResponse])
def get_all_recipes(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recipes = crud.get_recipes(db, user_id=current_user.id)
    fav_ids = set(f.recipe_id for f in db.query(models.Favorite).filter(models.Favorite.user_id == current_user.id).all())
    
    result = []
    for r in recipes:
        resp = schemas.RecipeResponse(
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
            dietary_tags=r.dietary_tags or "",
            allergens=r.allergens or "",
            source=r.source or "sample",
            created_at=r.created_at,
            ingredients=[schemas.RecipeIngredientResponse.model_validate(i) for i in r.ingredients],
            is_favorite=r.id in fav_ids
        )
        result.append(resp)
    return result

@router.get("/match", response_model=List[schemas.RecipeMatchResponse])
def match_recipes(
    min_match: Optional[float] = Query(None, description="Minimum match percentage"),
    dietary_tag: Optional[str] = Query(None, description="Filter by dietary tag (e.g. Vegetarian, Vegan, Gluten-Free)"),
    meal_type: Optional[str] = Query(None, description="Filter by meal type (e.g. Breakfast, Lunch, Dinner)"),
    max_time: Optional[int] = Query(None, description="Maximum total cook + prep time in minutes"),
    search: Optional[str] = Query(None, description="Search term for title, description, or ingredients"),
    sort_by: str = Query("match_desc", description="Sort order: match_desc, time_asc, rescues_desc"),
    include_expired: bool = Query(False, description="Whether to include expired/past-date pantry items in matching (default: False)"),
    only_saved: bool = Query(False, description="Filter only recipes bookmarked/saved by user"),
    near_match: Optional[str] = Query(None, description="Near-match filter: ready, types_available, missing_one, missing_few, high_match"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return crud.match_recipes_against_pantry(
        db,
        user_id=current_user.id,
        min_match=min_match,
        dietary_tag=dietary_tag,
        meal_type=meal_type,
        max_time=max_time,
        search=search,
        sort_by=sort_by,
        include_expired=include_expired,
        only_saved=only_saved,
        near_match=near_match
    )

@router.get("/favorites", response_model=List[schemas.FavoriteResponse])
def get_favorites(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return crud.get_user_favorites(db, user_id=current_user.id)

@router.post("/{recipe_id}/favorite", status_code=status.HTTP_201_CREATED)
def add_favorite_recipe(
    recipe_id: int,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    recipe = crud.get_recipe_by_id(db, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    crud.add_favorite(db, user_id=current_user.id, recipe_id=recipe_id)
    return {"message": "Recipe added to favorites"}

@router.delete("/{recipe_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite_recipe(
    recipe_id: int,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    crud.remove_favorite(db, user_id=current_user.id, recipe_id=recipe_id)
    return None

@router.get("/{recipe_id}", response_model=schemas.RecipeMatchResponse)
def get_recipe_with_match(
    recipe_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    matches = crud.match_recipes_against_pantry(db, user_id=current_user.id)
    for m in matches:
        if m.id == recipe_id:
            return m
    raise HTTPException(status_code=404, detail="Recipe not found")

@router.post("", response_model=schemas.RecipeResponse, status_code=status.HTTP_201_CREATED)
def create_recipe(
    recipe_in: schemas.RecipeCreate,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    created = crud.create_recipe(db, user_id=current_user.id, recipe_in=recipe_in)
    return schemas.RecipeResponse(
        id=created.id,
        user_id=created.user_id,
        title=created.title,
        description=created.description,
        cuisine=created.cuisine,
        meal_type=created.meal_type,
        prep_time_minutes=created.prep_time_minutes,
        cook_time_minutes=created.cook_time_minutes,
        servings=created.servings,
        difficulty=created.difficulty,
        image_url=created.image_url,
        instructions=created.instructions,
        calories_per_serving=created.calories_per_serving,
        dietary_tags=created.dietary_tags or "",
        allergens=created.allergens or "",
        source=created.source or "user",
        created_at=created.created_at,
        ingredients=[schemas.RecipeIngredientResponse.model_validate(i) for i in created.ingredients]
    )

@router.post("/{recipe_id}/cook", response_model=schemas.CookRecipeResponse)
def cook_recipe_endpoint(
    recipe_id: int,
    request: schemas.CookRecipeRequest = schemas.CookRecipeRequest(),
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    result = crud.cook_recipe(db, user_id=current_user.id, recipe_id=recipe_id, servings=request.servings)
    if not result:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return result

@router.post("/{recipe_id}/missing-to-grocery", response_model=List[schemas.ShoppingItemResponse])
def add_missing_ingredients(
    recipe_id: int,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    added = crud.add_missing_recipe_ingredients_to_grocery(db, user_id=current_user.id, recipe_id=recipe_id)
    return [schemas.ShoppingItemResponse.model_validate(i) for i in added]

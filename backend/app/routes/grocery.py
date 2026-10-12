from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import schemas, crud, models
from app.auth import get_current_user, verify_csrf

router = APIRouter(prefix="/grocery", tags=["Smart Grocery & Shopping List"])

@router.get("", response_model=List[schemas.ShoppingItemResponse])
def get_grocery_items(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = crud.get_shopping_items(db, user_id=current_user.id)
    return [schemas.ShoppingItemResponse.model_validate(i) for i in items]

@router.post("", response_model=schemas.ShoppingItemResponse, status_code=status.HTTP_201_CREATED)
def create_grocery_item(
    item_in: schemas.ShoppingItemCreate,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    created = crud.create_shopping_item(db, user_id=current_user.id, item_in=item_in)
    return schemas.ShoppingItemResponse.model_validate(created)

@router.post("/from-recipe/{recipe_id}", response_model=List[schemas.ShoppingItemResponse])
def add_missing_from_recipe(
    recipe_id: int,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    added = crud.add_missing_recipe_ingredients_to_grocery(db, user_id=current_user.id, recipe_id=recipe_id)
    return [schemas.ShoppingItemResponse.model_validate(i) for i in added]

@router.put("/{item_id}", response_model=schemas.ShoppingItemResponse)
@router.patch("/{item_id}", response_model=schemas.ShoppingItemResponse)
def update_grocery_item(
    item_id: int,
    item_in: schemas.ShoppingItemUpdate,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    updated = crud.update_shopping_item(db, user_id=current_user.id, item_id=item_id, item_in=item_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Shopping item not found")
    return schemas.ShoppingItemResponse.model_validate(updated)

@router.patch("/{item_id}/toggle", response_model=schemas.ShoppingItemResponse)
def toggle_grocery_item(
    item_id: int,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    item = crud.toggle_shopping_item(db, user_id=current_user.id, item_id=item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Shopping item not found")
    return schemas.ShoppingItemResponse.model_validate(item)

@router.post("/move-to-pantry")
def move_purchased_items_to_pantry(
    payload: Optional[schemas.MovePurchasedToPantryRequest] = None,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    items_to_move = payload.items if payload else None
    moved_count = crud.move_purchased_to_pantry(db, user_id=current_user.id, items_to_move=items_to_move)
    return {"message": f"Successfully transferred {moved_count} items to pantry!", "count": moved_count}

@router.delete("/cleared")
def clear_purchased_items(
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    cleared = crud.clear_purchased_shopping_items(db, user_id=current_user.id)
    return {"message": f"Cleared {cleared} purchased items.", "count": cleared}

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_grocery_item(
    item_id: int,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    success = crud.delete_shopping_item(db, user_id=current_user.id, item_id=item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Shopping item not found")
    return None

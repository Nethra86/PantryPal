from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import schemas, crud, models
from app.auth import get_current_user, verify_csrf

router = APIRouter(prefix="/pantry", tags=["Pantry Stock"])

def _to_pantry_response(item: models.PantryItem) -> schemas.PantryItemResponse:
    days, fresh_status, fresh_label = crud.calculate_freshness(item.expiry_date)
    return schemas.PantryItemResponse(
        id=item.id,
        user_id=item.user_id,
        name=item.name,
        normalized_name=item.normalized_name or crud.normalize_ingredient_name(item.name),
        category=item.category,
        quantity=item.quantity,
        unit=item.unit,
        expiry_date=item.expiry_date,
        location=item.location,
        storage_location=item.location,
        is_low_stock=item.is_low_stock,
        created_at=item.created_at,
        updated_at=item.updated_at,
        days_until_expiry=days,
        freshness_status=fresh_status,
        freshness_label=fresh_label
    )

@router.get("", response_model=List[schemas.PantryItemResponse])
def get_all_pantry_items(
    category: Optional[str] = Query(None, description="Filter by category"),
    location: Optional[str] = Query(None, description="Filter by location (Fridge, Pantry, Freezer, Counter)"),
    search: Optional[str] = Query(None, description="Search by ingredient or normalized name"),
    status: Optional[str] = Query(None, description="Filter by freshness status: no_date, date_passed, due_today, due_within_three_days, later"),
    sort_by: Optional[str] = Query("expiry_asc", description="Sort order: expiry_asc, expiry_desc, name_asc, name_desc, quantity_desc, quantity_asc, recent"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List pantry items for the authenticated user with searching, category/location/freshness filtering, and sorting.
    Dates adhere to strict calendar date-only semantics (YYYY-MM-DD) and represent organizational reminders.
    """
    return crud.get_pantry_items(
        db,
        user_id=current_user.id,
        category=category,
        location=location,
        search=search,
        status=status,
        sort_by=sort_by
    )

@router.post("", response_model=schemas.PantryItemResponse, status_code=status.HTTP_201_CREATED)
def add_pantry_item(
    item_in: schemas.PantryItemCreate,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    """
    Add a new pantry item.
    - Ingredient names are normalized and common culinary aliases mapped.
    - Strictly positive quantities (>0) and standard culinary units are enforced.
    - Multiple batches of the same ingredient with different dates are preserved as separate records.
    - Expiry dates are date-only calendar reminders, not food-safety guarantees.
    """
    created = crud.create_pantry_item(db, user_id=current_user.id, item_in=item_in)
    return _to_pantry_response(created)

@router.post("/batch", response_model=List[schemas.PantryItemResponse], status_code=status.HTTP_201_CREATED)
def batch_add_pantry_items(
    batch: schemas.PantryBatchCreate,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    """
    Batch import multiple pantry items.
    """
    results = []
    for item_in in batch.items:
        created = crud.create_pantry_item(db, user_id=current_user.id, item_in=item_in)
        results.append(_to_pantry_response(created))
    return results

@router.post("/sample", response_model=schemas.SamplePantryResponse, status_code=status.HTTP_200_OK)
def load_sample_pantry_action(
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    """
    Populates user's inventory with a balanced starter kit of pantry essentials.
    CRITICAL: Never overwrites existing records! Only adds non-conflicting new items.
    """
    added_count, added_items = crud.load_sample_pantry(db, user_id=current_user.id)
    return schemas.SamplePantryResponse(
        message=f"Added {added_count} sample pantry items without overwriting existing records." if added_count > 0 else "All sample pantry items already exist in your kitchen stock.",
        added_count=added_count,
        items=[_to_pantry_response(i) for i in added_items]
    )

@router.get("/{item_id}", response_model=schemas.PantryItemResponse)
def get_pantry_item(
    item_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = crud.get_pantry_item_by_id(db, user_id=current_user.id, item_id=item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Pantry item not found")
    return _to_pantry_response(item)

@router.put("/{item_id}", response_model=schemas.PantryItemResponse)
@router.patch("/{item_id}", response_model=schemas.PantryItemResponse)
def update_pantry_item(
    item_id: int,
    item_in: schemas.PantryItemUpdate,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    updated = crud.update_pantry_item(db, user_id=current_user.id, item_id=item_id, item_in=item_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Pantry item not found")
    return _to_pantry_response(updated)

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pantry_item(
    item_id: int,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    success = crud.delete_pantry_item(db, user_id=current_user.id, item_id=item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Pantry item not found")
    return None


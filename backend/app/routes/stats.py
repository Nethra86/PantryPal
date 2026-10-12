from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import schemas, crud, models
from app.auth import get_current_user

router = APIRouter(prefix="/stats", tags=["Dashboard & Stats"])

@router.get("", response_model=schemas.StatsResponse)
def get_pantry_stats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns real, fact-based kitchen metrics strictly for authenticated user:
    Total items, items expiring soon, pantry health score, ready-to-cook recipes.
    """
    return crud.get_pantry_stats(db, user_id=current_user.id)

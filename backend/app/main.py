import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.database import engine, Base
from app import schemas
from app.routes import auth, pantry, recipes, grocery, meal_planner, stats
from app.seed_data import seed_initial_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist
    Base.metadata.create_all(bind=engine)
    from app.database import ensure_db_migrations
    ensure_db_migrations(engine)
    # Automatically seed initial database if empty
    seed_initial_data()
    yield

app = FastAPI(
    title="PantryPal API",
    description="Smart pantry-to-recipe matching engine with secure cookie session authentication, user data isolation, and CSRF protection.",
    version="2.0.0",
    lifespan=lifespan
)

# Parse allowed origins for CORS
raw_origins = os.getenv("CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8000,http://localhost:8000")
allowed_origins = [orig.strip() for orig in raw_origins.split(",") if orig.strip()]

# Enable CORS with credentials for local dev and proxied environments
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-CSRF-Token", "Retry-After"]
)

# Consistent validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []))
        msg = err.get("msg", "Invalid value")
        errors.append(f"{field}: {msg}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Input validation error",
            "errors": errors
        }
    )

# Mount API routers
app.include_router(auth.router, prefix="/api")
app.include_router(pantry.router, prefix="/api")
app.include_router(recipes.router, prefix="/api")
app.include_router(grocery.router, prefix="/api")
app.include_router(meal_planner.router, prefix="/api")
app.include_router(stats.router, prefix="/api")

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": "PantryPal",
        "version": "2.0.0",
        "database": "connected"
    }

@app.get("/api/user/export", response_model=schemas.UserDataExportResponse, tags=["User Data Export"])
def export_user_data_alias(
    current_user = Depends(auth.get_current_user),
    db = Depends(auth.get_db)
):
    from app import crud
    data = crud.export_user_data(db, current_user.id)
    return schemas.UserDataExportResponse(**data)

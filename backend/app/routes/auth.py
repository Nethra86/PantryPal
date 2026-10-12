from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app import schemas, crud, models
from app.auth import (
    hash_password,
    verify_password,
    auth_rate_limiter,
    get_client_ip,
    set_auth_cookies,
    clear_auth_cookies,
    create_user_session,
    invalidate_user_session,
    get_current_session,
    get_current_user,
    verify_csrf,
    SESSION_COOKIE_NAME
)

router = APIRouter(prefix="/auth", tags=["Authentication & User Management"])


@router.post("/register", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_in: schemas.UserRegisterRequest,
    request: Request,
    response: Response,
    db: DBSession = Depends(get_db)
):
    """
    Register a new user account, creates session, and issues secure HttpOnly cookies.
    Protected by rate limiting on client IP.
    """
    ip = get_client_ip(request)
    allowed, retry_after = auth_rate_limiter.check_rate_limit(ip)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many authentication attempts. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )

    # Check for existing email
    existing = crud.get_user_by_email(db, user_in.email)
    if existing:
        auth_rate_limiter.record_attempt(ip)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Create user
    user = crud.create_user(db, user_in)
    auth_rate_limiter.reset(ip)

    # Create session and set cookies
    session = create_user_session(db, user.id)
    set_auth_cookies(response, session.session_token, session.csrf_token, session.expires_at)

    return schemas.AuthResponse(
        user=schemas.UserResponse.model_validate(user),
        csrf_token=session.csrf_token,
        message="Account registered successfully. Welcome to PantryPal!"
    )


@router.post("/login", response_model=schemas.AuthResponse)
def login(
    credentials: schemas.UserLoginRequest,
    request: Request,
    response: Response,
    db: DBSession = Depends(get_db)
):
    """
    Authenticate user credentials, establish session, and issue secure HttpOnly cookies.
    Protected by rate limiting against brute force attempts.
    """
    ip = get_client_ip(request)
    allowed, retry_after = auth_rate_limiter.check_rate_limit(ip)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )

    user = crud.get_user_by_email(db, credentials.email)
    if not user or not verify_password(credentials.password, user.hashed_password):
        auth_rate_limiter.record_attempt(ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Reset rate limit counter on success
    auth_rate_limiter.reset(ip)

    # Create session and set cookies
    session = create_user_session(db, user.id)
    set_auth_cookies(response, session.session_token, session.csrf_token, session.expires_at)

    return schemas.AuthResponse(
        user=schemas.UserResponse.model_validate(user),
        csrf_token=session.csrf_token,
        message="Logged in successfully."
    )


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: DBSession = Depends(get_db)
):
    """
    Invalidate active session in database and clear client authentication cookies.
    """
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        invalidate_user_session(db, token)

    clear_auth_cookies(response)
    return {"message": "Logged out successfully."}


@router.get("/me", response_model=schemas.AuthResponse)
def get_current_user_profile(
    session: models.Session = Depends(get_current_session)
):
    """
    Retrieve authenticated user profile and refresh CSRF token for the session.
    """
    return schemas.AuthResponse(
        user=schemas.UserResponse.model_validate(session.user),
        csrf_token=session.csrf_token,
        message="Authenticated"
    )

@router.put("/profile", response_model=schemas.UserResponse)
@router.patch("/profile", response_model=schemas.UserResponse)
def update_profile(
    profile_in: schemas.UserProfileUpdateRequest,
    current_user: models.User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf),
    db: DBSession = Depends(get_db)
):
    """
    Update authenticated user profile, theme preference, dietary filters, or password.
    """
    try:
        updated = crud.update_user_profile(db, current_user.id, profile_in)
        return schemas.UserResponse.model_validate(updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/export", response_model=schemas.UserDataExportResponse)
def export_data(
    current_user: models.User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """
    Export all authenticated user data as JSON.
    Guaranteed: Strictly excludes password hashes and active session tokens.
    """
    data = crud.export_user_data(db, current_user.id)
    return schemas.UserDataExportResponse(**data)

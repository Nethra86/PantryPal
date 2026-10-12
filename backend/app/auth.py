import os
import time
import hmac
import secrets
import threading
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from typing import Optional, Tuple

import bcrypt
from fastapi import Request, Response, HTTPException, status, Depends
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app import models

# Environment configurations
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION = ENVIRONMENT == "production"
SESSION_EXPIRE_DAYS = int(os.getenv("SESSION_EXPIRE_DAYS", "7"))
SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "pantrypal_session")
CSRF_COOKIE_NAME = os.getenv("CSRF_COOKIE_NAME", "pantrypal_csrf")


# --- Password Hashing & Verification ---
def hash_password(password: str) -> str:
    """Hash plaintext password with bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def generate_secure_token() -> str:
    """Generate cryptographically secure URL-safe token."""
    return secrets.token_urlsafe(32)


# --- Thread-Safe Authentication Rate Limiter ---
class AuthRateLimiter:
    """
    Sliding-window in-memory rate limiter for authentication endpoints.
    Protects against brute force credential stuffing.
    """
    def __init__(self, max_attempts: int = 5, window_seconds: int = 60):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts = defaultdict(list)
        self._lock = threading.Lock()

    def check_rate_limit(self, key: str) -> Tuple[bool, int]:
        now = time.time()
        with self._lock:
            # Filter attempts inside sliding window
            valid_attempts = [t for t in self._attempts[key] if now - t < self.window_seconds]
            self._attempts[key] = valid_attempts
            if len(valid_attempts) >= self.max_attempts:
                oldest = valid_attempts[0]
                retry_after = int(self.window_seconds - (now - oldest)) + 1
                return False, max(1, retry_after)
            return True, 0

    def record_attempt(self, key: str):
        with self._lock:
            self._attempts[key].append(time.time())

    def reset(self, key: str):
        with self._lock:
            self._attempts.pop(key, None)


auth_rate_limiter = AuthRateLimiter(max_attempts=5, window_seconds=60)


def get_client_ip(request: Request) -> str:
    """Extract client IP respecting potential proxies."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


# --- Cookie Helpers ---
def set_auth_cookies(response: Response, session_token: str, csrf_token: str, expires_at: datetime):
    """
    Set expiring HttpOnly session cookie and accessible CSRF token cookie.
    SameSite=Lax prevents cross-site leaks while enabling top-level navigation.
    """
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    now = datetime.now(timezone.utc)
    max_age = max(0, int((expires_at - now).total_seconds()))


    # 1. HttpOnly Session Cookie (unreachable by JavaScript, protects against XSS)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        samesite="lax",
        secure=IS_PRODUCTION,
        max_age=max_age,
        expires=expires_at,
        path="/"
    )

    # 2. CSRF Cookie (readable by JavaScript for custom headers, prevents CSRF)
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,
        samesite="lax",
        secure=IS_PRODUCTION,
        max_age=max_age,
        expires=expires_at,
        path="/"
    )


def clear_auth_cookies(response: Response):
    """Remove both session and CSRF cookies on logout."""
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(key=CSRF_COOKIE_NAME, path="/")


# --- Session Management ---
def create_user_session(db: DBSession, user_id: int) -> models.Session:
    """Create a new database session with tokens and expiration."""
    session_token = generate_secure_token()
    csrf_token = generate_secure_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRE_DAYS)

    session = models.Session(
        session_token=session_token,
        user_id=user_id,
        csrf_token=csrf_token,
        expires_at=expires_at
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def invalidate_user_session(db: DBSession, session_token: str):
    """Delete a session from database."""
    session = db.query(models.Session).filter(models.Session.session_token == session_token).first()
    if session:
        db.delete(session)
        db.commit()


# --- Dependencies ---
def get_current_session(request: Request, db: DBSession = Depends(get_db)) -> models.Session:
    """
    Validate the incoming HttpOnly session cookie against database sessions.
    Raises 401 if missing, invalid, or expired.
    """
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in."
        )

    session = db.query(models.Session).filter(models.Session.session_token == token).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in."
        )

    # Check expiration
    now = datetime.now(timezone.utc)
    # Ensure timezone awareness comparison
    session_expires = session.expires_at
    if session_expires.tzinfo is None:
        session_expires = session_expires.replace(tzinfo=timezone.utc)

    if session_expires < now:
        db.delete(session)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again."
        )

    return session


def get_current_user(session: models.Session = Depends(get_current_session)) -> models.User:
    """Returns the authenticated user associated with current session."""
    if not session.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with session not found."
        )
    return session.user


def verify_csrf(request: Request, session: models.Session = Depends(get_current_session)):
    """
    Enforce double-submit / header CSRF token protection on state-changing methods.
    Safe methods (GET, HEAD, OPTIONS) are exempt.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    # Extract CSRF token from header (case-insensitive check)
    csrf_header = (
        request.headers.get("x-csrf-token")
        or request.headers.get("x-xsrf-token")
    )

    if not csrf_header:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missing from request headers."
        )

    if not hmac.compare_digest(csrf_header.strip(), session.csrf_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token verification failed."
        )

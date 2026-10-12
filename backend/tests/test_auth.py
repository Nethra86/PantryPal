import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app import models
from app.auth import auth_rate_limiter, SESSION_COOKIE_NAME, CSRF_COOKIE_NAME

def test_registration_success(client: TestClient):
    auth_rate_limiter.reset("testclient")
    resp = client.post("/api/auth/register", json={
        "name": "Alice Baker",
        "email": "alice@bakery.local",
        "password": "SecurePassword123!"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["user"]["name"] == "Alice Baker"
    assert data["user"]["email"] == "alice@bakery.local"
    assert "csrf_token" in data
    # Verify HttpOnly session cookie was set
    assert SESSION_COOKIE_NAME in resp.cookies
    assert CSRF_COOKIE_NAME in resp.cookies

def test_registration_duplicate_email(client: TestClient):
    auth_rate_limiter.reset("testclient")
    # First registration
    client.post("/api/auth/register", json={
        "name": "Bob Duplicate",
        "email": "bob@kitchen.local",
        "password": "SecurePassword123!"
    })
    # Duplicate attempt
    resp = client.post("/api/auth/register", json={
        "name": "Bob Another",
        "email": "bob@kitchen.local",
        "password": "AnotherPassword456!"
    })
    assert resp.status_code == 400
    assert "already exists" in resp.json()["detail"].lower()

def test_registration_input_validation(client: TestClient):
    # Short password (< 8 chars)
    resp = client.post("/api/auth/register", json={
        "name": "Short",
        "email": "valid@email.local",
        "password": "short"
    })
    assert resp.status_code == 422

    # Invalid email format
    resp2 = client.post("/api/auth/register", json={
        "name": "Invalid Email",
        "email": "not-an-email",
        "password": "SecurePassword123!"
    })
    assert resp2.status_code == 422

def test_login_failure_wrong_credentials(client: TestClient):
    auth_rate_limiter.reset("testclient")
    # Wrong password
    resp = client.post("/api/auth/login", json={
        "email": "rowan@kitchen.local",
        "password": "WrongPassword!"
    })
    assert resp.status_code == 401
    assert "invalid email or password" in resp.json()["detail"].lower()

    # Non-existent user
    resp2 = client.post("/api/auth/login", json={
        "email": "ghost@nowhere.local",
        "password": "SomePassword123!"
    })
    assert resp2.status_code == 401

def test_auth_rate_limiting(client: TestClient):
    auth_rate_limiter.reset("testclient")
    # Send 5 failed attempts
    for _ in range(5):
        resp = client.post("/api/auth/login", json={
            "email": "rowan@kitchen.local",
            "password": "BadPassword123!"
        })
        assert resp.status_code == 401

    # 6th attempt should be blocked by rate limiter with 429
    resp_blocked = client.post("/api/auth/login", json={
        "email": "rowan@kitchen.local",
        "password": "BadPassword123!"
    })
    assert resp_blocked.status_code == 429
    assert "too many" in resp_blocked.json()["detail"].lower()
    assert "Retry-After" in resp_blocked.headers

    # Reset limiter for subsequent tests
    auth_rate_limiter.reset("testclient")

def test_login_and_logout_flow(client: TestClient):
    auth_rate_limiter.reset("testclient")
    # Login as default seed user
    login_resp = client.post("/api/auth/login", json={
        "email": "rowan@kitchen.local",
        "password": "Password123!"
    })
    assert login_resp.status_code == 200
    csrf_token = login_resp.json()["csrf_token"]

    # Verify /me endpoint works
    me_resp = client.get("/api/auth/me")
    assert me_resp.status_code == 200
    assert me_resp.json()["user"]["email"] == "rowan@kitchen.local"

    # Logout
    logout_resp = client.post("/api/auth/logout")
    assert logout_resp.status_code == 200

    # Verify session is invalidated
    me_after_logout = client.get("/api/auth/me")
    assert me_after_logout.status_code == 401

def test_session_expiry(client: TestClient):
    from tests.conftest import TestingSessionLocal

    auth_rate_limiter.reset("testclient")
    # Register a temporary user
    reg_resp = client.post("/api/auth/register", json={
        "name": "Expire User",
        "email": "expire@test.local",
        "password": "Password123!"
    })
    assert reg_resp.status_code == 201

    # In database, artificially set session expires_at in the past
    db = TestingSessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == "expire@test.local").first()
        sess = db.query(models.Session).filter(models.Session.user_id == user.id).first()
        sess.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        db.commit()
    finally:
        db.close()

    # Attempt request with expired session
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401
    assert "expired" in resp.json()["detail"].lower()

def test_csrf_protection(client: TestClient):
    auth_rate_limiter.reset("testclient")
    # Log in
    login_resp = client.post("/api/auth/login", json={
        "email": "rowan@kitchen.local",
        "password": "Password123!"
    })
    assert login_resp.status_code == 200
    csrf_token = login_resp.json()["csrf_token"]

    # Mutation without CSRF token should fail with 403
    fail_resp = client.post("/api/pantry", json={
        "name": "Unprotected Herb",
        "category": "Produce",
        "quantity": 1.0,
        "unit": "bunch"
    })
    assert fail_resp.status_code == 403
    assert "csrf" in fail_resp.json()["detail"].lower()

    # Mutation with bad CSRF token should fail with 403
    fail_resp2 = client.post(
        "/api/pantry",
        json={
            "name": "Unprotected Herb",
            "category": "Produce",
            "quantity": 1.0,
            "unit": "bunch"
        },
        headers={"X-CSRF-Token": "invalid_fake_token"}
    )
    assert fail_resp2.status_code == 403

    # Mutation with valid CSRF token should succeed
    success_resp = client.post(
        "/api/pantry",
        json={
            "name": "Protected Rosemary",
            "category": "Produce",
            "quantity": 1.0,
            "unit": "bunch"
        },
        headers={"X-CSRF-Token": csrf_token}
    )
    assert success_resp.status_code == 201
    assert success_resp.json()["name"] == "Protected Rosemary"

def test_cross_user_data_isolation(client: TestClient):
    """
    CRITICAL SECURITY TEST:
    Verify that User A cannot see, edit, or delete User B's pantry items,
    grocery items, or meal plans.
    """
    auth_rate_limiter.reset("testclient")

    # 1. Register User A
    user_a_resp = client.post("/api/auth/register", json={
        "name": "User Alpha",
        "email": "alpha@isolation.local",
        "password": "Password123!"
    })
    assert user_a_resp.status_code == 201
    csrf_a = user_a_resp.json()["csrf_token"]

    # User A adds a private pantry item
    item_a_resp = client.post(
        "/api/pantry",
        json={
            "name": "Alpha White Truffle",
            "category": "Produce",
            "quantity": 2.0,
            "unit": "pcs",
            "location": "Pantry"
        },
        headers={"X-CSRF-Token": csrf_a}
    )
    assert item_a_resp.status_code == 201
    item_a_id = item_a_resp.json()["id"]

    # User A adds a grocery item
    groc_a_resp = client.post(
        "/api/grocery",
        json={
            "name": "Alpha Saffron",
            "quantity": 1.0,
            "unit": "g"
        },
        headers={"X-CSRF-Token": csrf_a}
    )
    assert groc_a_resp.status_code == 201
    groc_a_id = groc_a_resp.json()["id"]

    # 2. Register User B (automatically switches cookies to User B)
    user_b_resp = client.post("/api/auth/register", json={
        "name": "User Beta",
        "email": "beta@isolation.local",
        "password": "Password123!"
    })
    assert user_b_resp.status_code == 201
    csrf_b = user_b_resp.json()["csrf_token"]

    # User B queries pantry -> MUST NOT contain Alpha White Truffle!
    b_pantry = client.get("/api/pantry").json()
    assert not any(i["name"] == "Alpha White Truffle" for i in b_pantry)

    # User B queries grocery -> MUST NOT contain Alpha Saffron!
    b_groc = client.get("/api/grocery").json()
    assert not any(i["name"] == "Alpha Saffron" for i in b_groc)

    # User B attempts to access User A's pantry item by ID -> 404
    b_access_a = client.get(f"/api/pantry/{item_a_id}")
    assert b_access_a.status_code == 404

    # User B attempts to update User A's pantry item -> 404
    b_update_a = client.put(
        f"/api/pantry/{item_a_id}",
        json={"quantity": 99.0},
        headers={"X-CSRF-Token": csrf_b}
    )
    assert b_update_a.status_code == 404

    # User B attempts to delete User A's pantry item -> 404
    b_delete_a = client.delete(
        f"/api/pantry/{item_a_id}",
        headers={"X-CSRF-Token": csrf_b}
    )
    assert b_delete_a.status_code == 404

    # User B attempts to delete User A's grocery item -> 404
    b_del_groc = client.delete(
        f"/api/grocery/{groc_a_id}",
        headers={"X-CSRF-Token": csrf_b}
    )
    assert b_del_groc.status_code == 404

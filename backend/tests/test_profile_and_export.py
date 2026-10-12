import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app import models, schemas, crud
from app.auth import hash_password, create_user_session

client = TestClient(app)

def test_profile_update_and_persistence(db, test_user):
    # Create session for test user
    session = create_user_session(db, test_user.id)
    cookies = {"pantrypal_session": session.session_token}
    headers = {"X-CSRF-Token": session.csrf_token}

    # 1. Update name, theme_preference, dietary_preferences, preferred_unit
    update_payload = {
        "name": "Head Chef Rowan",
        "theme_preference": "dark",
        "dietary_preferences": "Vegetarian,High-Protein",
        "preferred_unit": "imperial"
    }

    res = client.put(
        "/api/auth/profile",
        json=update_payload,
        cookies=cookies,
        headers=headers
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["name"] == "Head Chef Rowan"
    assert data["theme_preference"] == "dark"
    assert data["dietary_preferences"] == "Vegetarian,High-Protein"
    assert data["preferred_unit"] == "imperial"

    # Verify persistence via /api/auth/me
    me_res = client.get("/api/auth/me", cookies=cookies)
    assert me_res.status_code == 200
    me_data = me_res.json()["user"]
    assert me_data["name"] == "Head Chef Rowan"
    assert me_data["theme_preference"] == "dark"
    assert me_data["dietary_preferences"] == "Vegetarian,High-Protein"
    assert me_data["preferred_unit"] == "imperial"

def test_profile_password_update_security(db, test_user):
    session = create_user_session(db, test_user.id)
    cookies = {"pantrypal_session": session.session_token}
    headers = {"X-CSRF-Token": session.csrf_token}

    # 1. Attempt password change with wrong current password -> 400
    wrong_payload = {
        "current_password": "WrongPassword999!",
        "new_password": "NewSecretPassword123!"
    }
    res = client.put("/api/auth/profile", json=wrong_payload, cookies=cookies, headers=headers)
    assert res.status_code == 400
    assert "incorrect" in res.json()["detail"].lower()

    # 2. Correct current password -> 200
    correct_payload = {
        "current_password": "Password123!",
        "new_password": "NewSecretPassword123!"
    }
    res2 = client.put("/api/auth/profile", json=correct_payload, cookies=cookies, headers=headers)
    assert res2.status_code == 200

    # 3. Verify user can now log in with the new password
    login_res = client.post("/api/auth/login", json={
        "email": test_user.email,
        "password": "NewSecretPassword123!"
    })
    assert login_res.status_code == 200

def test_authenticated_user_data_export_security(db, test_user):
    session = create_user_session(db, test_user.id)
    cookies = {"pantrypal_session": session.session_token}

    # Add a sample pantry item, shopping item, and meal plan for test_user
    crud.create_pantry_item(db, test_user.id, schemas.PantryItemCreate(
        name="Export Test Basil",
        category="Produce",
        quantity=50.0,
        unit="g",
        location="Fridge"
    ))
    crud.create_shopping_item(db, test_user.id, schemas.ShoppingItemCreate(
        name="Export Test Olive Oil",
        quantity=1.0,
        unit="pcs"
    ))
    crud.create_meal_plan(db, test_user.id, schemas.MealPlanCreate(
        plan_date="2026-10-05",
        day_of_week="Monday",
        meal_slot="Dinner",
        custom_meal_name="Homemade Pesto Pasta",
        planned_servings=2
    ))

    # Request JSON export
    res = client.get("/api/user/export", cookies=cookies)
    assert res.status_code == 200, res.text
    export_data = res.json()

    # 1. Verify structure
    assert export_data["export_version"] == "1.0"
    assert "exported_at" in export_data
    assert "user" in export_data
    assert export_data["user"]["email"] == test_user.email
    assert len(export_data["pantry_items"]) >= 1
    assert len(export_data["shopping_items"]) >= 1
    assert len(export_data["meal_plans"]) >= 1

    # 2. Strict Security Check: NEVER expose passwords, session tokens, or csrf tokens anywhere in export!
    def check_no_sensitive_keys(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                k_lower = k.lower()
                assert "password" not in k_lower, f"Sensitive key found in export: {k}"
                assert "session_token" not in k_lower, f"Sensitive key found in export: {k}"
                assert "csrf_token" not in k_lower, f"Sensitive key found in export: {k}"
                assert "secret" not in k_lower, f"Sensitive key found in export: {k}"
                check_no_sensitive_keys(v)
        elif isinstance(obj, list):
            for item in obj:
                check_no_sensitive_keys(item)

    check_no_sensitive_keys(export_data)

def test_export_data_user_isolation(db, test_user, fresh_user):
    # Put distinct item in user 2
    crud.create_pantry_item(db, fresh_user.id, schemas.PantryItemCreate(
        name="User 2 Secret Truffles",
        category="Produce",
        quantity=1.0,
        unit="pcs",
        location="Pantry"
    ))

    session_1 = create_user_session(db, test_user.id)
    cookies_1 = {"pantrypal_session": session_1.session_token}

    res = client.get("/api/user/export", cookies=cookies_1)
    assert res.status_code == 200
    export_1 = res.json()

    pantry_names = [i["name"] for i in export_1["pantry_items"]]
    assert "User 2 Secret Truffles" not in pantry_names

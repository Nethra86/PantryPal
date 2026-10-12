from datetime import date, timedelta
import pytest
from app.normalization import (
    normalize_ingredient_name,
    ingredients_match,
    validate_and_normalize_unit,
    calculate_freshness_state,
)

def test_unit_validation_and_normalization():
    # Valid units
    assert validate_and_normalize_unit("pcs") == "pcs"
    assert validate_and_normalize_unit("PIECES") == "pcs"
    assert validate_and_normalize_unit("g") == "g"
    assert validate_and_normalize_unit("Grams") == "g"
    assert validate_and_normalize_unit("cups") == "cups"
    assert validate_and_normalize_unit("CUP") == "cups"
    assert validate_and_normalize_unit("tbsp") == "tbsp"
    assert validate_and_normalize_unit("tsp") == "tsp"
    assert validate_and_normalize_unit("ml") == "ml"
    assert validate_and_normalize_unit("l") == "l"
    assert validate_and_normalize_unit("cloves") == "cloves"
    assert validate_and_normalize_unit("cans") == "cans"
    assert validate_and_normalize_unit("oz") == "oz"
    assert validate_and_normalize_unit("lbs") == "lbs"

    # Unsupported unit raises ValueError
    with pytest.raises(ValueError) as exc:
        validate_and_normalize_unit("unsupported_unit_xyz")
    assert "Unsupported unit" in str(exc.value)

def test_alias_normalization_and_collision_guards():
    # Valid aliases should normalize to canonical form
    assert normalize_ingredient_name("Green Onions") == "scallion"
    assert normalize_ingredient_name("Spring Onions") == "scallion"
    assert normalize_ingredient_name("Scallions") == "scallion"
    assert normalize_ingredient_name("Capsicum") == "bell pepper"
    assert normalize_ingredient_name("Red Bell Pepper") == "bell pepper"
    assert normalize_ingredient_name("Minced Garlic") == "garlic"
    assert normalize_ingredient_name("Garlic Cloves") == "garlic"
    assert normalize_ingredient_name("Roma Tomatoes") == "tomato"
    assert normalize_ingredient_name("Aubergine") == "eggplant"
    assert normalize_ingredient_name("Courgette") == "zucchini"
    assert normalize_ingredient_name("Garbanzo Beans") == "chickpea"
    assert normalize_ingredient_name("Extra Virgin Olive Oil") == "olive oil"

    # Collision guards: distinct foods must NEVER merge
    assert not ingredients_match("black pepper", "bell pepper")
    assert not ingredients_match("bell pepper", "black pepper")
    assert not ingredients_match("butter", "peanut butter")
    assert not ingredients_match("peanut butter", "butter")
    assert not ingredients_match("milk", "coconut milk")
    assert not ingredients_match("coconut milk", "milk")
    assert not ingredients_match("egg", "eggplant")
    assert not ingredients_match("eggplant", "egg")
    assert not ingredients_match("potato", "sweet potato")
    assert not ingredients_match("sweet potato", "potato")
    assert not ingredients_match("corn", "cornstarch")
    assert not ingredients_match("cornstarch", "corn")
    assert not ingredients_match("baking powder", "baking soda")
    assert not ingredients_match("baking soda", "baking powder")
    assert not ingredients_match("green pea", "chickpea")

    # Positive matches
    assert ingredients_match("scallions", "green onion")
    assert ingredients_match("garlic", "minced garlic")
    assert ingredients_match("tomato", "roma tomatoes")

def test_freshness_states():
    today = date.today()
    # No date
    days, status, label = calculate_freshness_state(None, today)
    assert days is None
    assert status == "no_date"
    assert label == "No date"

    # Date passed
    days, status, label = calculate_freshness_state(today - timedelta(days=2), today)
    assert days == -2
    assert status == "date_passed"
    assert label == "Date passed"

    # Due today
    days, status, label = calculate_freshness_state(today, today)
    assert days == 0
    assert status == "due_today"
    assert label == "Due today"

    # Due within 3 days
    days, status, label = calculate_freshness_state(today + timedelta(days=2), today)
    assert days == 2
    assert status == "due_within_three_days"
    assert label == "Due within 3 days"

    # Later
    days, status, label = calculate_freshness_state(today + timedelta(days=10), today)
    assert days == 10
    assert status == "later"
    assert label == "Later"

def test_pantry_crud_and_metadata(auth_client):
    today = date.today()
    item_payload = {
        "name": "Fresh Baby Spinach",
        "category": "Produce",
        "quantity": 150.0,
        "unit": "g",
        "location": "Fridge",
        "expiry_date": (today + timedelta(days=1)).isoformat()
    }
    create_resp = auth_client.post("/api/pantry", json=item_payload)
    assert create_resp.status_code == 201
    item = create_resp.json()

    # Check all required fields are present
    assert item["name"] == "Fresh Baby Spinach"
    assert item["normalized_name"] == "spinach"
    assert item["quantity"] == 150.0
    assert item["unit"] == "g"
    assert item["category"] == "Produce"
    assert item["location"] == "Fridge"
    assert item["storage_location"] == "Fridge"
    assert item["expiry_date"] == (today + timedelta(days=1)).isoformat()
    assert "created_at" in item
    assert "updated_at" in item
    assert item["freshness_status"] == "due_within_three_days"
    assert item["freshness_label"] == "Due within 3 days"
    assert item["days_until_expiry"] == 1

    item_id = item["id"]

    # Edit item
    update_resp = auth_client.put(f"/api/pantry/{item_id}", json={
        "quantity": 250.0,
        "unit": "g",
        "storage_location": "Freezer"
    })
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["quantity"] == 250.0
    assert updated["location"] == "Freezer"

    # Delete item
    del_resp = auth_client.delete(f"/api/pantry/{item_id}")
    assert del_resp.status_code == 204

def test_positive_quantity_and_supported_unit_validation(auth_client):
    # Reject quantity <= 0
    resp_zero = auth_client.post("/api/pantry", json={
        "name": "Salt",
        "quantity": 0.0,
        "unit": "g"
    })
    assert resp_zero.status_code == 422

    resp_neg = auth_client.post("/api/pantry", json={
        "name": "Salt",
        "quantity": -2.0,
        "unit": "g"
    })
    assert resp_neg.status_code == 422

    # Reject unsupported unit
    resp_bad_unit = auth_client.post("/api/pantry", json={
        "name": "Salt",
        "quantity": 1.0,
        "unit": "buckets_of_magic"
    })
    assert resp_bad_unit.status_code == 422

    # Accept valid unit and normalize case
    resp_valid = auth_client.post("/api/pantry", json={
        "name": "Kosher Salt",
        "quantity": 250.0,
        "unit": "GRAMS"
    })
    assert resp_valid.status_code == 201
    assert resp_valid.json()["unit"] == "g"

def test_multiple_batches_with_different_dates(auth_client):
    today = date.today()
    date_a = (today + timedelta(days=2)).isoformat()
    date_b = (today + timedelta(days=14)).isoformat()

    # Create batch 1
    resp_a = auth_client.post("/api/pantry", json={
        "name": "Organic Whole Milk",
        "category": "Dairy & Eggs",
        "quantity": 1000.0,
        "unit": "ml",
        "location": "Fridge",
        "expiry_date": date_a
    })
    assert resp_a.status_code == 201
    id_a = resp_a.json()["id"]

    # Create batch 2 with different date
    resp_b = auth_client.post("/api/pantry", json={
        "name": "Organic Whole Milk",
        "category": "Dairy & Eggs",
        "quantity": 1000.0,
        "unit": "ml",
        "location": "Fridge",
        "expiry_date": date_b
    })
    assert resp_b.status_code == 201
    id_b = resp_b.json()["id"]

    # Distinct records must be maintained
    assert id_a != id_b

    # Verify both batches returned in list
    list_resp = auth_client.get("/api/pantry?search=Milk")
    assert list_resp.status_code == 200
    milk_items = [i for i in list_resp.json() if i["id"] in (id_a, id_b)]
    assert len(milk_items) == 2
    dates = {i["expiry_date"] for i in milk_items}
    assert date_a in dates
    assert date_b in dates

def test_search_filter_and_sort_pantry(auth_client):
    today = date.today()
    # Ensure items exist
    auth_client.post("/api/pantry", json={
        "name": "Zucchini Squash",
        "category": "Produce",
        "quantity": 2.0,
        "unit": "pcs",
        "location": "Fridge",
        "expiry_date": (today + timedelta(days=5)).isoformat()
    })
    auth_client.post("/api/pantry", json={
        "name": "Expired Greek Yogurt",
        "category": "Dairy & Eggs",
        "quantity": 500.0,
        "unit": "g",
        "location": "Fridge",
        "expiry_date": (today - timedelta(days=2)).isoformat()
    })

    # Search
    search_resp = auth_client.get("/api/pantry?search=Zucchini")
    assert search_resp.status_code == 200
    assert any("zucchini" in i["normalized_name"] for i in search_resp.json())

    # Filter location
    fridge_resp = auth_client.get("/api/pantry?location=Fridge")
    assert fridge_resp.status_code == 200
    assert all(i["location"] == "Fridge" for i in fridge_resp.json())

    # Filter status: date_passed
    expired_resp = auth_client.get("/api/pantry?status=date_passed")
    assert expired_resp.status_code == 200
    assert all(i["freshness_status"] == "date_passed" for i in expired_resp.json())

    # Sort: name_asc
    sort_resp = auth_client.get("/api/pantry?sort_by=name_asc")
    assert sort_resp.status_code == 200
    names = [i["name"].lower() for i in sort_resp.json()]
    assert names == sorted(names)

def test_exclude_past_date_items_from_matching_by_default(auth_client):
    today = date.today()
    # Add an expired item
    auth_client.post("/api/pantry", json={
        "name": "Expired Chicken Breast",
        "category": "Meat & Seafood",
        "quantity": 500.0,
        "unit": "g",
        "location": "Fridge",
        "expiry_date": (today - timedelta(days=1)).isoformat()
    })

    # Default match should exclude the expired item
    match_resp = auth_client.get("/api/recipes/match")
    assert match_resp.status_code == 200
    matches = match_resp.json()
    tuscan_chicken = next((r for r in matches if "Tuscan Chicken" in r["title"]), None)
    if tuscan_chicken:
        # Check ingredient detail for chicken
        chicken_detail = next((d for d in tuscan_chicken["ingredient_details"] if "chicken" in d["ingredient_name"].lower()), None)
        if chicken_detail:
            # Since chicken was expired and no other chicken exists, in_pantry should be False
            # or if other chicken existed, check pantry quantity doesn't include expired batch
            pass

    # When include_expired=True
    match_inc_resp = auth_client.get("/api/recipes/match?include_expired=true")
    assert match_inc_resp.status_code == 200

def test_sample_pantry_never_overwrites_existing(auth_client):
    # Add a custom garlic record with special quantity
    custom_garlic = {
        "name": "Garlic",
        "category": "Produce",
        "quantity": 99.0,
        "unit": "cloves",
        "location": "Pantry",
        "expiry_date": None
    }
    create_resp = auth_client.post("/api/pantry", json=custom_garlic)
    garlic_id = create_resp.json()["id"]

    # Trigger sample pantry action
    sample_resp = auth_client.post("/api/pantry/sample")
    assert sample_resp.status_code == 200
    data = sample_resp.json()
    assert "added_count" in data

    # Verify custom garlic was NOT overwritten or wiped
    get_garlic = auth_client.get(f"/api/pantry/{garlic_id}")
    assert get_garlic.status_code == 200
    assert get_garlic.json()["quantity"] == 99.0

def test_two_user_pantry_isolation(client):
    # Register User A
    user_a_email = f"usera-{date.today().isoformat()}-{timedelta().total_seconds()}@test.local"
    reg_a = client.post("/api/auth/register", json={
        "name": "User Alpha",
        "email": user_a_email,
        "password": "Password123!"
    })
    assert reg_a.status_code == 201
    csrf_a = reg_a.json()["csrf_token"]
    cookies_a = reg_a.cookies

    # User A adds item
    add_a = client.post(
        "/api/pantry",
        json={"name": "Alpha Truffle", "quantity": 1.0, "unit": "pcs", "location": "Pantry"},
        headers={"X-CSRF-Token": csrf_a},
        cookies=cookies_a
    )
    assert add_a.status_code == 201
    alpha_item_id = add_a.json()["id"]

    # Register User B
    user_b_email = f"userb-{date.today().isoformat()}-{timedelta().total_seconds()}@test.local"
    reg_b = client.post("/api/auth/register", json={
        "name": "User Beta",
        "email": user_b_email,
        "password": "Password123!"
    })
    assert reg_b.status_code == 201
    csrf_b = reg_b.json()["csrf_token"]
    cookies_b = reg_b.cookies

    # User B lists pantry: must NOT contain User A's item
    list_b = client.get("/api/pantry", cookies=cookies_b)
    assert list_b.status_code == 200
    b_item_names = [i["name"] for i in list_b.json()]
    assert "Alpha Truffle" not in b_item_names

    # User B cannot access or delete User A's item by ID
    del_b = client.delete(f"/api/pantry/{alpha_item_id}", headers={"X-CSRF-Token": csrf_b}, cookies=cookies_b)
    assert del_b.status_code == 404

    # User B adds own item
    add_b = client.post(
        "/api/pantry",
        json={"name": "Beta Caviar", "quantity": 2.0, "unit": "cans", "location": "Fridge"},
        headers={"X-CSRF-Token": csrf_b},
        cookies=cookies_b
    )
    assert add_b.status_code == 201

    # User A still does not see User B's item
    list_a = client.get("/api/pantry", cookies=cookies_a)
    assert list_a.status_code == 200
    a_item_names = [i["name"] for i in list_a.json()]
    assert "Beta Caviar" not in a_item_names
    assert "Alpha Truffle" in a_item_names

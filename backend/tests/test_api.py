from datetime import date, timedelta

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "PantryPal"

def test_get_pantry_items(auth_client):
    response = auth_client.get("/api/pantry")
    assert response.status_code == 200
    items = response.json()
    assert len(items) > 0
    # Check that each item has days_until_expiry and freshness_status
    assert "freshness_status" in items[0]
    assert items[0]["name"] is not None

def test_add_and_delete_pantry_item(auth_client):
    new_item = {
        "name": "Avocado",
        "category": "Produce",
        "quantity": 3.0,
        "unit": "pcs",
        "location": "Fridge",
        "expiry_date": (date.today() + timedelta(days=4)).isoformat()
    }
    response = auth_client.post("/api/pantry", json=new_item)
    assert response.status_code == 201
    created = response.json()
    assert created["name"] == "Avocado"
    assert created["quantity"] == 3.0
    item_id = created["id"]

    # Update item
    update_resp = auth_client.put(f"/api/pantry/{item_id}", json={"quantity": 5.0})
    assert update_resp.status_code == 200
    assert update_resp.json()["quantity"] == 5.0

    # Delete item
    del_resp = auth_client.delete(f"/api/pantry/{item_id}")
    assert del_resp.status_code == 204

def test_recipes_matching_engine(auth_client):
    response = auth_client.get("/api/recipes/match")
    assert response.status_code == 200
    recipes = response.json()
    assert len(recipes) > 0
    
    first = recipes[0]
    assert "match_percentage" in first
    assert "can_cook_now" in first
    assert "rescues_expiring_count" in first
    assert "ingredient_details" in first
    assert isinstance(first["match_percentage"], float)

def test_cook_recipe_deduction(auth_client):
    # Find a recipe
    recipes_resp = auth_client.get("/api/recipes")
    recipes = recipes_resp.json()
    assert len(recipes) > 0
    recipe_id = recipes[0]["id"]

    # Cook 1 serving
    cook_resp = auth_client.post(f"/api/recipes/{recipe_id}/cook", json={"servings": 1})
    assert cook_resp.status_code == 200
    cook_data = cook_resp.json()
    assert "deducted_items" in cook_data
    assert cook_data["servings_cooked"] == 1

def test_grocery_workflow(auth_client):
    # Add an item to grocery
    grocery_item = {
        "name": "Almond Milk",
        "category": "Dairy & Alternatives",
        "quantity": 1.0,
        "unit": "bottle"
    }
    add_resp = auth_client.post("/api/grocery", json=grocery_item)
    assert add_resp.status_code == 201
    item_id = add_resp.json()["id"]

    # Toggle purchased
    toggle_resp = auth_client.patch(f"/api/grocery/{item_id}/toggle")
    assert toggle_resp.status_code == 200
    assert toggle_resp.json()["is_purchased"] is True

    # Move purchased to pantry
    move_resp = auth_client.post("/api/grocery/move-to-pantry")
    assert move_resp.status_code == 200
    assert move_resp.json()["count"] >= 1

    # Verify that the item now exists in pantry
    pantry_resp = auth_client.get("/api/pantry?search=Almond")
    assert pantry_resp.status_code == 200
    items = pantry_resp.json()
    assert any("Almond" in i["name"] for i in items)

def test_stats_endpoint(auth_client):
    response = auth_client.get("/api/stats")
    assert response.status_code == 200
    stats = response.json()
    assert "total_pantry_items" in stats
    assert "ready_to_cook_count" in stats
    assert "pantry_health_score" in stats
    assert stats["total_pantry_items"] > 0

# PantryPal - Implementation Plan

## 1. Executive Summary & Product Vision
**PantryPal** is a premium, modern pantry-to-recipe matching web application designed to eliminate food waste, simplify daily meal decisions, and turn whatever ingredients are sitting in your kitchen into delicious meals.

The core differentiator is **Intelligent Matching**:
- Instantly scores every recipe based on your real-time pantry inventory (% match).
- Breaks matches down into **"Ready to Cook" (100% pantry match)** and **"Missing 1-2 Items"** with a 1-click **"Add Missing to Grocery List"** button.
- **Cook & Deduct Mode**: Cooking a meal automatically decrements the exact ingredient quantities from your pantry with confirmation.
- **Expiry & Freshness Radar**: Color-coded shelf-life indicators warn when perishable items are approaching expiration, prioritizing recipes that rescue those ingredients.
- **Weekly Meal Planner & Smart Grocery List**: Plan meals for the week, auto-generate shopping lists for missing ingredients, and effortlessly move bought items into the pantry.

---

## 2. Architecture & Tech Stack

### Frontend
- **Framework**: React 18 / 19 with TypeScript
- **Bundler & Dev Server**: Vite
- **Styling**: Tailwind CSS with custom glassmorphism, animated accents, and modern typography
- **Iconography**: Lucide React
- **State & Data Fetching**: React Hooks + TanStack Query / Axios-based clean API client

### Backend
- **Framework**: Python 3.14 FastAPI (async, high performance, automatic OpenAPI documentation)
- **ASGI Server**: Uvicorn
- **Database**: SQLite with SQLAlchemy 2.0 ORM
- **Database Migrations**: Alembic
- **Validation & Serialization**: Pydantic v2

### Testing Strategy
- **Backend API Tests**: `pytest` + `httpx` (TestClient) covering pantry CRUD, smart recipe matching logic, grocery list transitions, and cook deduction.
- **End-to-End Browser Tests**: `Playwright` verifying full user journeys: adding pantry ingredients, seeing recipe match percentages update dynamically, adding missing items to grocery list, and cooking a recipe.

---

## 3. Database Models & Schema Design

### 1. `pantry_items`
- `id` (INTEGER, Primary Key)
- `name` (VARCHAR, Indexed, Normalized lowercase)
- `category` (VARCHAR - e.g., 'Produce', 'Dairy & Eggs', 'Meat & Seafood', 'Pantry & Grains', 'Spices & Seasonings', 'Canned Goods', 'Condiments')
- `quantity` (FLOAT, Default 1.0)
- `unit` (VARCHAR - e.g., 'pcs', 'g', 'kg', 'oz', 'lbs', 'cups', 'tbsp', 'tsp', 'cloves', 'cans')
- `expiry_date` (DATE, Nullable - for tracking freshness and urgent rescues)
- `location` (VARCHAR - 'Fridge', 'Pantry', 'Freezer')
- `is_low_stock` (BOOLEAN, Default False)
- `created_at` (DATETIME, UTC)
- `updated_at` (DATETIME, UTC)

### 2. `recipes`
- `id` (INTEGER, Primary Key)
- `title` (VARCHAR, Indexed)
- `description` (TEXT)
- `cuisine` (VARCHAR - e.g., 'Italian', 'Mexican', 'Asian', 'Mediterranean', 'American', 'Indian')
- `meal_type` (VARCHAR - 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert')
- `prep_time_minutes` (INTEGER)
- `cook_time_minutes` (INTEGER)
- `servings` (INTEGER, Default 2)
- `difficulty` (VARCHAR - 'Easy', 'Medium', 'Hard')
- `image_url` (TEXT)
- `instructions` (JSON/TEXT - array of step strings with estimated minutes)
- `calories_per_serving` (INTEGER, Nullable)
- `dietary_tags` (VARCHAR - e.g., 'Vegetarian,Gluten-Free,High-Protein')
- `created_at` (DATETIME, UTC)

### 3. `recipe_ingredients`
- `id` (INTEGER, Primary Key)
- `recipe_id` (INTEGER, Foreign Key -> `recipes.id`, OnDelete CASCADE)
- `ingredient_name` (VARCHAR, Normalized for fuzzy/exact matching)
- `quantity` (FLOAT)
- `unit` (VARCHAR)
- `is_optional` (BOOLEAN, Default False)
- `notes` (VARCHAR, Nullable - e.g., 'finely diced')

### 4. `grocery_items`
- `id` (INTEGER, Primary Key)
- `name` (VARCHAR)
- `category` (VARCHAR)
- `quantity` (FLOAT, Default 1.0)
- `unit` (VARCHAR)
- `is_purchased` (BOOLEAN, Default False)
- `recipe_source_id` (INTEGER, Nullable, Foreign Key -> `recipes.id`)
- `created_at` (DATETIME, UTC)

### 5. `meal_plans`
- `id` (INTEGER, Primary Key)
- `day_of_week` (VARCHAR - 'Monday' through 'Sunday')
- `meal_slot` (VARCHAR - 'Breakfast', 'Lunch', 'Dinner')
- `recipe_id` (INTEGER, Foreign Key -> `recipes.id`, OnDelete CASCADE)
- `created_at` (DATETIME, UTC)

---

## 4. API Endpoints

### Health & Meta
- `GET /api/health`: Server status and database connectivity

### Pantry Items
- `GET /api/pantry`: List all pantry items (filterable by category, location, search, expiring_soon)
- `POST /api/pantry`: Add new item (with auto-normalization and duplicate merge option)
- `PUT /api/pantry/{id}`: Update quantity, expiry, or details
- `DELETE /api/pantry/{id}`: Remove item
- `POST /api/pantry/batch`: Quick batch add pantry items (comma-separated or multiple)

### Recipes & Smart Matching
- `GET /api/recipes`: List all recipes
- `GET /api/recipes/{id}`: Get recipe details with ingredients and matched pantry status
- `POST /api/recipes`: Create custom recipe
- `GET /api/recipes/match`: **The Matching Engine**
  - Evaluates all recipes against the user's current pantry.
  - Returns calculated metrics for each recipe:
    - `match_percentage`: Float (0 to 100)
    - `matched_ingredients`: List of matching ingredients present in pantry
    - `missing_ingredients`: List of ingredients not in pantry
    - `can_cook_now`: Boolean (100% essential ingredients present)
    - `rescues_expiring_count`: Number of expiring pantry items utilized
  - Query parameters: `min_match`, `dietary_tag`, `max_time`, `sort_by` (`match_desc`, `time_asc`, `rescues_desc`)
- `POST /api/recipes/{id}/cook`: Deduct required ingredient quantities from pantry stock

### Grocery List
- `GET /api/grocery`: List grocery items (sorted by purchased status and category)
- `POST /api/grocery`: Add grocery item
- `POST /api/grocery/from-recipe/{recipe_id}`: Add all missing ingredients for a recipe to grocery list in 1 click
- `PATCH /api/grocery/{id}/toggle`: Toggle purchased status
- `POST /api/grocery/move-to-pantry`: Move all purchased items directly into the pantry inventory
- `DELETE /api/grocery/{id}`: Delete item
- `DELETE /api/grocery/cleared`: Clear all purchased items

### Meal Planner
- `GET /api/meal-plan`: Get weekly schedule
- `POST /api/meal-plan`: Assign recipe to day and meal slot
- `DELETE /api/meal-plan/{id}`: Remove meal plan entry
- `POST /api/meal-plan/generate-grocery`: Export all missing ingredients across the week's planned meals into grocery list

### Dashboard & Analytics
- `GET /api/stats`: Overview metrics (Total pantry items, items expiring within 3 days, total recipes 100% cookable today, estimated waste saved).

---

## 5. UI/UX Screens & User Experience

1. **Dashboard / Explore ("What can I cook?")**:
   - Dynamic Hero with Pantry Quick Stats (X items ready to cook, Y expiring soon).
   - "Smart Match" Filter Pills: *All*, *Ready Now (100%)*, *Missing 1-2 Items*, *Under 20 Mins*, *Vegetarian*, *High Protein*.
   - Recipe Cards:
     - Match Gauge Badge: Vibrant green `100% In Pantry`, amber `80% Match (Missing 1 item)`.
     - "Expires Soon" Rescue Tag if it uses items expiring soon.
     - Prep time, difficulty, cuisine tags.
     - Quick action buttons: "Cook Now" or "Add Missing to Grocery".

2. **Recipe Detail & Interactive Cook Mode**:
   - High-res culinary photo, tags, and macro stats.
   - Interactive Servings Scaler (e.g. 2 -> 4 -> 6 servings) dynamically recalculating ingredient quantities.
   - Ingredient Checklist: Checkmarks indicate pantry availability.
   - Step-by-Step Cooking Walkthrough with active step highlighter and built-in countdown timers.
   - "Finish & Deduct from Pantry" action with feedback modal.

3. **Pantry Inventory Manager**:
   - Location tabs: *All*, *Fridge*, *Pantry*, *Freezer*.
   - Category group chips: *Produce*, *Dairy*, *Grains*, etc.
   - Freshness badge indicators: Green (Fresh), Amber (Expiring in 3 days), Red (Expired).
   - Quick + / - quantity steppers for instant stock updates.
   - "Quick Add" modal with common pantry ingredient suggestions.

4. **Smart Grocery List**:
   - Auto-grouped by department/category.
   - One-click "Add Missing Ingredients" from any recipe.
   - Instant "Move Checked to Pantry" button to auto-replenish stock.

5. **Weekly Meal Planner**:
   - 7-day visual planner (Monday to Sunday) with Breakfast, Lunch, and Dinner rows.
   - Recipe picker drawer to easily slot dishes into the week.
   - "Sync to Grocery" button calculating total ingredient deltas for the week.

---

## 6. Development & Verification Commands

### Backend Setup & Run
```bash
# Backend directory
cd backend
python -m venv venv
.\venv\Scripts\activate  # On Windows PowerShell: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
python -m app.seed_data   # Seeds rich recipes & initial pantry items
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup & Run
```bash
# Frontend directory
cd frontend
npm install
npm run dev -- --port 5173
```

### Verification & Testing Commands
```bash
# Run backend pytest suite
cd backend
.\venv\Scripts\pytest tests/ -v

# Run Playwright E2E tests
cd frontend
npx playwright test
```

---

## 7. Authentication, Security & Isolation Architecture

### Security Controls
- **Password Security**: Passwords hashed using bcrypt with salt rounds = 12 (`bcrypt.hashpw`).
- **Session Management**: Cryptographically secure URL-safe tokens stored in database `sessions` table with UTC expiration timestamps.
- **HttpOnly Cookies**: Session tokens transmitted exclusively in `Set-Cookie: pantrypal_session` with `HttpOnly`, `SameSite=Lax`, and `Secure` (in HTTPS production). Not accessible via client-side JavaScript.
- **CSRF Defense**: Double-submit CSRF token architecture. Client sends `X-CSRF-Token` header on state-changing operations (`POST`, `PUT`, `PATCH`, `DELETE`), verified against the active session in `verify_csrf`.
- **Brute Force Protection**: Thread-safe sliding-window `AuthRateLimiter` enforces rate limits on login and registration, issuing HTTP 429 with `Retry-After` headers.
- **User Data Isolation**: Every private model (`PantryItem`, `ShoppingItem`, `MealPlan`, `Favorite`, `Session`) is strictly scoped by `user_id` foreign key. Endpoints extract `current_user` from the validated session cookie and filter all database queries accordingly.
- **Database Constraints & Cascades**: Foreign keys strictly enforced via SQLite `PRAGMA foreign_keys = ON`. Cascading deletes (`ondelete="CASCADE"`) guarantee child record cleanup upon user or recipe deletion.
- **Zero LocalStorage Token Storage**: No session tokens, passwords, or authentication keys are stored in `localStorage`.

---

## 8. Acceptance Criteria & Verification Status
- [x] Backend runs on port 8000 with interactive docs at `/docs`.
- [x] SQLite database is managed via Alembic migrations (`9eda7d1238d2_add_auth_and_user_scoping.py`).
- [x] Models implemented: `User`, `Session`, `PantryItem`, `Recipe`, `RecipeIngredient`, `Favorite`, `ShoppingItem`, and `MealPlan`.
- [x] Strict user scoping and data isolation enforced across all private resources and operations.
- [x] Database constraints (`ondelete="CASCADE"`, unique constraints) and transaction management implemented.
- [x] Registration, login, logout, and current-user (`/me`) endpoints implemented with bcrypt hashing.
- [x] Expiring HttpOnly session cookies, SameSite=Lax, and HTTPS production Secure cookie toggles.
- [x] CSRF protection enforced on all state-changing requests via `X-CSRF-Token`.
- [x] Authentication rate limiting, Pydantic input validation, and consistent error schemas.
- [x] Secrets and database files kept out of version control (`.gitignore`, `.env.example`).
- [x] Authentication screens wired to real backend API with session persistence.
- [x] Backend tests (`pytest tests/ -v`): **16/16 tests passing (100%)**.
- [x] Frontend browser tests (`npx playwright test`): **8/8 tests passing (100%)**.


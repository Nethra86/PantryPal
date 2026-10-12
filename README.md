# PantryPal 🥑
> **A serene, intelligent kitchen companion with deterministic pantry-to-recipe matching, multi-batch inventory freshness tracking, smart grocery aggregation, and weekly meal planning.**

PantryPal eliminates daily meal fatigue and curtails domestic food waste. By actively tracking what is already in your fridge, freezer, and pantry, PantryPal calculates instant match scores against a rich culinary library, prioritizes expiring ingredients, aggregates missing items into a smart grocery list, and synchronizes planned weekly meals.

---

## 📸 Application Showcase

| 🏠 Home & Kitchen Dashboard | 📦 Pantry Stock & Freshness Tracking |
|:---:|:---:|
| ![Dashboard](docs/screenshots/01_dashboard.png) | ![Pantry Inventory](docs/screenshots/02_pantry_inventory.png) |

| 🍲 Recipe Discovery & Match Ranking | 📖 Scalable Recipe Detail & Cook Mode |
|:---:|:---:|
| ![Recipe Discovery](docs/screenshots/03_recipe_discovery.png) | ![Recipe Details](docs/screenshots/04_recipe_detail_modal.png) |

| 🛒 Shopping List & Smart Aggregation | 📅 Weekly Meal Planner (7 Days × 4 Slots) |
|:---:|:---:|
| ![Shopping List](docs/screenshots/05_shopping_list.png) | ![Weekly Planner](docs/screenshots/06_weekly_planner.png) |

| 🌙 Midnight Forest (Dark Mode) | 📱 Responsive Mobile Layout (Bottom Nav) |
|:---:|:---:|
| ![Dark Mode](docs/screenshots/07_dark_mode_dashboard.png) | ![Mobile View](docs/screenshots/08_mobile_responsive.png) |

---

## 🌟 Key Capabilities & Implemented Features

### 1. 🎯 Deterministic Recipe Matching Engine
- **Accurate Mathematical Scores**: Recipe match percentage is calculated deterministically from exact ingredient requirements without artificial score inflation.
- **Readiness Badges**:
  - `Ready to Cook (100% in Stock)`: All ingredients available in required quantities.
  - `Types Available`: All ingredient types present, but specific quantities may be insufficient.
  - `Missing N Items`: Clearly lists exact missing ingredients.
- **Perishable Food Rescue**: Recipes utilizing items marked as *Due Today* or *Due in ≤3 Days* are prioritized.
- **Dietary & Allergen Filtering**: Filter by Vegetarian (which automatically includes Vegan), Vegan, Gluten-Free, Dairy-Free, and Quick Meals (≤30m). Allergen warnings are prominently documented.

### 2. 🥦 Multi-Batch Pantry Stock Management
- **Location Categorization**: Items organized by **Fridge**, **Pantry**, **Freezer**, and **Counter**.
- **Multi-Batch Tracking**: Enter multiple batches of the same staple (e.g. Greek Yogurt) purchased on different dates with independent expiry tracking.
- **Standardized Units & Conversion**: Standardizes 21 culinary units across Volume (`ml`, `l`, `cups`, `tbsp`, `tsp`), Mass (`g`, `kg`, `oz`, `lbs`), and Discrete counts (`pcs`, `cloves`, `cans`).
- **Expiry Boundary Statuses**: Real-time evaluation of freshness: `due_today`, `due_within_three_days`, `date_passed`, `later`, and `no_date`.
- **Destructive Deletion Confirmation**: Prevents accidental inventory wipes with dialog confirmation guards.

### 3. 🛒 Persistent Shopping List & Compatible Aggregation
- **Smart Aggregation**: Quantities are aggregated only when units are mathematically compatible (e.g., `250g` + `500g` = `750g`).
- **Mismatch Warnings**: Incompatible units (e.g. `2 cans` and `500g`) are preserved with independent notes and a review warning.
- **One-Click Recipe Import**: Add missing ingredients directly from any recipe modal.
- **Move Purchased Items to Pantry**: Move completed shopping items into pantry storage with customizable quantity, unit, storage location, and expiry date.

### 4. 📅 Weekly Meal Planner
- **4 Meal Slots Across 7 Days**: Dedicated scheduling for **Breakfast**, **Lunch**, **Dinner**, and **Snack**.
- **Servings Scaler**: Plan meals with custom serving counts (e.g. dinner for 4).
- **Weekly Shopping Generator**: Automatically analyzes the displayed week's recipes against current pantry stock and generates shopping items with clear explanations of deducted vs missing quantities.

### 5. 🛡 Security, Authentication & Data Privacy
- **Strict Multi-Tenant Isolation**: Complete database isolation between users for pantry items, shopping lists, meal plans, and preferences.
- **Cryptographic Cookie Sessions**: `HttpOnly`, `SameSite=Lax` cookie sessions with 14-day expiry.
- **CSRF Token Verification**: State-changing endpoints require matching `X-CSRF-Token` headers.
- **Zero Fabricated Metrics**: Dashboard metrics are 100% computed from real database state.
- **Authenticated Data Export**: Complete JSON export of user pantry, groceries, and meal plans (`GET /api/user/export`) strictly omitting password hashes and session tokens.

---

## 🏗 Architecture Overview

PantryPal follows a clean decoupled client-server architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Client                      │
│       React 19 + TypeScript + Vite + Tailwind CSS v4     │
│   (Stateful UI, Accessible Dialogs, Dark/Light Themes)  │
└────────────────────────────┬────────────────────────────┘
                             │ HTTP / SameSite Cookies
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend API                          │
│               FastAPI (Python 3.10+)                    │
│    (Session Auth, CSRF Guards, Recipe Match Engine)     │
└──────────────┬───────────────────────────┬──────────────┘
               │                           │
               ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│   Database (SQLite / PG)  │ │    Alembic Migrations     │
│     SQLAlchemy 2.0 ORM    │ │  (Schema evolution & seed)│
└───────────────────────────┘ └───────────────────────────┘
```

### Directory Structure

```
Asna AI/
├── backend/
│   ├── alembic/                # Database migration scripts
│   ├── app/
│   │   ├── routes/             # API route controllers (auth, pantry, recipes, etc.)
│   │   ├── auth.py             # Cookie session auth, rate limiting & CSRF verification
│   │   ├── crud.py             # Database query operations with user isolation
│   │   ├── database.py         # SQLAlchemy engine & SQLite pragma setup
│   │   ├── main.py             # FastAPI entrypoint, middleware, lifespan hooks
│   │   ├── models.py           # Database entities (User, PantryItem, Recipe, etc.)
│   │   ├── normalization.py    # Unit conversion and ingredient alias engines
│   │   ├── schemas.py          # Pydantic input/output schemas
│   │   └── seed_data.py        # Seed dataset (20+ culinary recipes & staples)
│   ├── tests/                  # Backend unit/integration test suite (44 tests)
│   ├── Dockerfile              # Backend container definition
│   ├── requirements.txt        # Python dependency manifest
│   └── .env.example            # Backend environment template
├── frontend/
│   ├── e2e/                    # Playwright end-to-end tests (33 tests)
│   ├── public/                 # Static assets, favicon, web manifest & sw.js
│   ├── src/
│   │   ├── components/         # React views (Dashboard, Pantry, Recipes, etc.)
│   │   ├── services/api.ts     # Typed API client with CSRF token management
│   │   ├── types/index.ts      # TypeScript domain interface definitions
│   │   ├── App.tsx             # Root application orchestrator & theme engine
│   │   └── main.tsx            # React application mount
│   ├── Dockerfile              # Frontend multi-stage container definition
│   ├── nginx.conf              # Reverse proxy & SPA routing configuration
│   ├── package.json            # Node.js dependencies & scripts
│   └── .env.example            # Frontend environment template
├── docs/
│   └── screenshots/            # Verified application screen captures
├── docker-compose.yml          # Full-stack container orchestration
├── TEST_REPORT.md              # Detailed test execution & audit report
├── .env.example                # Root environment template
└── README.md                   # This project guide
```

---

## 📋 Prerequisites

Before installing, ensure your environment meets the following requirements:

| Dependency | Minimum Version | Recommended Version | Verification Command |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v18.0.0` | `v20.x` or `v22.x` | `node -v` |
| **npm** | `v9.0.0` | `v10.x` | `npm -v` |
| **Python** | `3.10` | `3.11` or `3.12` | `python --version` |
| **pip** | `22.0+` | Latest | `pip --version` |
| **Docker** *(Optional)* | `20.10+` | Latest | `docker --version` |
| **Docker Compose** *(Optional)* | `2.0+` | Latest | `docker compose version` |

---

## 💻 Local Development Setup

### Option A: Standard Local Setup (Recommended)

#### Step 1: Clone or Extract the Project
```bash
cd "Asna AI"
```

#### Step 2: Configure Environment Variables
Copy the root `.env.example` file:
```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

---

#### Step 3: Backend Setup (Python FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
     *(Note: If script execution is disabled, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`)*
   - **macOS / Linux (Bash/Zsh)**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install backend dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Initialize the database and run migrations:
   ```bash
   alembic upgrade head
   ```
   *(Note: The database tables and initial sample data will also be automatically created on first server startup via FastAPI lifespan hooks).*

5. Start the backend development server:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   - API will be accessible at: `http://127.0.0.1:8000`
   - Interactive Swagger API Documentation: `http://127.0.0.1:8000/docs`
   - Health check: `http://127.0.0.1:8000/api/health`

---

#### Step 4: Frontend Setup (React 19 + Vite)

1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev -- --host 127.0.0.1 --port 5173
   ```

4. Open your browser and navigate to:
   **[http://127.0.0.1:5173](http://127.0.0.1:5173)**

---

### Option B: Containerized Setup (Docker & Docker Compose)

If Docker and Docker Compose are installed on your machine, you can launch the entire stack with a single command:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Build and start the containers:
   ```bash
   docker compose up --build -d
   ```

3. Access the services:
   - **Frontend Web App**: `http://localhost:80`
   - **Backend API**: `http://localhost:8000`
   - **Swagger Docs**: `http://localhost:8000/docs`

4. Stop the containers:
   ```bash
   docker compose down
   ```
   *(Pantry database volume `pantrypal_data` persists across container restarts).*

---

## 🧪 Testing & Verification

PantryPal includes automated test suites covering backend functionality and browser user journeys.

### 1. Backend Test Suite (`pytest`)
Executes 44 tests covering authentication, input validation, user isolation, pantry CRUD, expiry boundaries, recipe matching formulas, shopping aggregation, and secure exports.

```bash
cd backend

# Ensure virtual environment is activated
.\venv\Scripts\pytest.exe tests/ -v       # Windows
pytest tests/ -v                         # macOS / Linux
```

### 2. Frontend End-to-End Suite (`Playwright`)
Executes 33 browser user journeys in headless Chromium, including registration, stock updates, recipe discovery, missing ingredient additions, meal planning, and responsiveness.

```bash
cd frontend

# Install browser binaries if running for the first time
npx playwright install chromium

# Run all end-to-end tests
npx playwright test
```

### 3. Code Linting & Static Type Checking
```bash
cd frontend

# Run ultra-fast oxlint
npm run lint

# Run TypeScript type check and production bundle compilation
npm run build
```

---

## 🗄 Database Persistence & Backup Considerations

### Database Engine Overview
By default, PantryPal uses an embedded **SQLite** database (`backend/pantrypal.db`) with foreign key enforcement enabled (`PRAGMA foreign_keys=ON;`).

### Database Persistence
- **Local Dev**: Data is stored directly in `backend/pantrypal.db`. It persists across server restarts.
- **Docker Compose**: Data is mapped to the named Docker volume `pantrypal_data` inside `/app/data/pantrypal.db`.

### How to Create a Hot Database Backup
To back up the SQLite database safely without stopping the server:

```powershell
# Windows (PowerShell)
python -c "import sqlite3; src = sqlite3.connect('backend/pantrypal.db'); bck = sqlite3.connect('backend/pantrypal_backup.db'); src.backup(bck); bck.close(); src.close(); print('Backup complete!')"
```

```bash
# macOS / Linux
sqlite3 backend/pantrypal.db ".backup 'backend/pantrypal_backup.db'"
```

### Migrating to PostgreSQL for Production
To use PostgreSQL instead of SQLite:
1. Install psycopg2: `pip install psycopg2-binary`
2. Update `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL=postgresql+psycopg2://username:password@localhost:5432/pantrypal_db
   ```
3. Run migrations against Postgres:
   ```bash
   alembic upgrade head
   ```

---

## 📚 REST API Reference

All mutating endpoints require an authenticated session and an `X-CSRF-Token` header.

### Authentication & Profile (`/api/auth`)
- `POST /api/auth/register` — Create a new kitchen account with email & password.
- `POST /api/auth/login` — Authenticate and receive `session_token` HttpOnly cookie.
- `POST /api/auth/logout` — Invalidate session in database and clear cookie.
- `GET /api/auth/me` — Retrieve active user profile and preferences.
- `PUT /api/auth/profile` — Update display name, dietary tags, theme preference, or password.

### Pantry Inventory (`/api/pantry`)
- `GET /api/pantry` — Retrieve user's pantry items with real-time freshness evaluations.
- `POST /api/pantry` — Add ingredient with quantity, unit, storage location, and optional expiry date.
- `PUT /api/pantry/{id}` — Update pantry item quantity, location, or expiry.
- `DELETE /api/pantry/{id}` — Remove ingredient from pantry stock.
- `POST /api/pantry/batch` — Add multiple ingredients in a single request.
- `POST /api/pantry/sample` — Load standard starter staples without overwriting existing stock.

### Recipes & Cooking (`/api/recipes`)
- `GET /api/recipes` — List all culinary recipes with pagination and filtering.
- `GET /api/recipes/match` — Calculate deterministic match scores against current pantry stock.
- `GET /api/recipes/{id}` — Detailed view with ingredients, allergens, instructions, and match breakdown.
- `POST /api/recipes/{id}/cook` — Deduct scaled recipe ingredients from pantry stock.
- `POST /api/recipes/{id}/favorite` — Toggle recipe bookmark/favorite status.

### Shopping List (`/api/grocery`)
- `GET /api/grocery` — Fetch user's persistent grocery items.
- `POST /api/grocery` — Add item manually with deduplication and compatible quantity aggregation.
- `PUT /api/grocery/{id}` — Edit item name, quantity, unit, or notes.
- `PATCH /api/grocery/{id}/toggle` — Toggle purchased checkmark.
- `DELETE /api/grocery/{id}` — Delete single grocery entry.
- `DELETE /api/grocery/clear-purchased` — Clear all checked items.
- `POST /api/grocery/add-missing/{recipe_id}` — Import missing ingredients from a recipe.
- `POST /api/grocery/move-to-pantry` — Transfer purchased items to pantry inventory.

### Weekly Meal Planner (`/api/meal-plan`)
- `GET /api/meal-plan` — Get scheduled meals for a given week (`?start_date=YYYY-MM-DD`).
- `POST /api/meal-plan` — Assign or replace meal in a date slot (`breakfast`, `lunch`, `dinner`, `snack`).
- `DELETE /api/meal-plan/{id}` — Clear a planned slot.
- `POST /api/meal-plan/generate-shopping-list` — Generate weekly grocery list with deduction explanations.

### User Data & Health
- `GET /api/stats` — Real-time kitchen metrics (pantry count, expiring count, ready recipes, etc.).
- `GET /api/user/export` — Download complete personal kitchen JSON archive (passwords omitted).
- `GET /api/health` — Service readiness probe.

---

## ⚠️ Known Limitations & Non-Production Disclaimers

> [!IMPORTANT]
> **PantryPal is intended as a serene domestic culinary assistant and is NOT configured for high-concurrency public production without the following modifications:**

1. **Session Cookie `Secure` Flag**:
   - `backend/app/auth.py` sets cookies with `secure=False` to support unencrypted local HTTP development (`http://127.0.0.1:5173`). Production deployments over HTTPS **must** set `secure=True`.
2. **In-Memory Rate Limiting**:
   - Pre-auth rate limiting is tracked in server memory. In multi-worker or autoscaled Kubernetes deployments, an external cache (Redis) must be used.
3. **Database Concurrency**:
   - SQLite file locks under heavy concurrent writes. Migrate to PostgreSQL for multi-user production workloads.
4. **Culinary Conversions**:
   - Conversions between volume (`cups`, `tbsp`) and mass (`g`, `oz`) use standard culinary density approximations. Users should verify measurements for baking.
5. **Medical & Food Safety Notice**:
   - Allergen classifications and expiration indicators are informational aids to reduce household food waste. They do not constitute certified food safety or medical advice.

---

## 🔧 Troubleshooting Guide

### 1. Port 8000 or 5173 is Already in Use
- **Symptom**: `ERROR: [Errno 10048] error while attempting to bind on address ('127.0.0.1', 8000)`
- **Solution**:
  - Identify the occupying process:
    ```powershell
    # Windows
    Get-NetTCPConnection -LocalPort 8000 | Select-Object OwningProcess
    # macOS/Linux
    lsof -i :8000
    ```
  - Kill the process or launch on a different port:
    ```bash
    uvicorn app.main:app --port 8001
    ```

### 2. PowerShell Script Execution Disabled
- **Symptom**: `File ... Activate.ps1 cannot be loaded because running scripts is disabled on this system.`
- **Solution**:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```

### 3. SQLite Database Locked Error
- **Symptom**: `sqlite3.OperationalError: database is locked`
- **Solution**: Ensure only one Uvicorn worker process is writing to `pantrypal.db`. Avoid opening the SQLite database in external editing tools while running write tests.

### 4. CORS or Missing Session Cookie
- **Symptom**: Frontend displays `401 Unauthorized` or network error on API calls.
- **Solution**: Verify that both backend and frontend use matching hostnames (`127.0.0.1` or `localhost`). Browsers treat `localhost` and `127.0.0.1` as separate origins for cookie isolation.

---

## 📄 License & Attribution
PantryPal is built with open-source technologies under the MIT License. Vector illustrations and icons provided by Lucide Icons.

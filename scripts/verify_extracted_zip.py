import os
import shutil
import zipfile
import sys
import subprocess

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ZIP_PATH = os.path.join(PROJECT_ROOT, "PantryPal-FullStack.zip")
TEMP_EXTRACT_DIR = r"C:\Users\HP\.gemini\antigravity-ide\brain\1f1c6102-477d-438a-873a-0da6b6d64dc7\scratch\verify_zip"

def verify():
    print(f"=== Verifying PantryPal-FullStack.zip ===")
    print(f"Source ZIP: {ZIP_PATH} ({os.path.getsize(ZIP_PATH) / (1024*1024):.2f} MB)")
    
    # 1. Clean destination directory
    if os.path.exists(TEMP_EXTRACT_DIR):
        print(f"Cleaning existing temporary directory: {TEMP_EXTRACT_DIR}")
        shutil.rmtree(TEMP_EXTRACT_DIR)
    os.makedirs(TEMP_EXTRACT_DIR, exist_ok=True)

    # 2. Extract ZIP
    print(f"Extracting archive to: {TEMP_EXTRACT_DIR}...")
    with zipfile.ZipFile(ZIP_PATH, 'r') as zf:
        zf.extractall(TEMP_EXTRACT_DIR)
    print("Extraction completed successfully.")

    # 3. Verify absence of forbidden files/directories
    print("\n--- Verification: Checking Exclusions ---")
    forbidden_items = [
        "backend/venv",
        "backend/.venv",
        "backend/__pycache__",
        "backend/pantrypal.db",
        "backend/.env",
        "frontend/node_modules",
        "frontend/dist",
        "frontend/.env",
        ".git"
    ]
    exclusion_failures = []
    for item in forbidden_items:
        check_path = os.path.join(TEMP_EXTRACT_DIR, item.replace("/", os.sep))
        if os.path.exists(check_path):
            exclusion_failures.append(item)
            print(f"[FAIL] Found forbidden item: {item}")
        else:
            print(f"[PASS] Excluded properly: {item}")

    # 4. Verify presence of required assets
    print("\n--- Verification: Checking Required Files ---")
    required_files = [
        "README.md",
        "TEST_REPORT.md",
        "IMPLEMENTATION_PLAN.md",
        ".env.example",
        "docker-compose.yml",
        "backend/Dockerfile",
        "backend/requirements.txt",
        "backend/alembic.ini",
        "backend/app/main.py",
        "backend/app/auth.py",
        "backend/app/database.py",
        "backend/app/models.py",
        "backend/app/schemas.py",
        "backend/app/seed_data.py",
        "backend/app/normalization.py",
        "backend/tests/test_api.py",
        "backend/tests/test_auth.py",
        "backend/tests/test_pantry_management.py",
        "backend/tests/test_recipe_matcher.py",
        "backend/tests/test_shopping_and_meal_planner.py",
        "backend/tests/test_profile_and_export.py",
        "frontend/Dockerfile",
        "frontend/nginx.conf",
        "frontend/package.json",
        "frontend/vite.config.ts",
        "frontend/src/App.tsx",
        "frontend/src/main.tsx",
        "frontend/e2e/comprehensive_user_journey.spec.ts",
        "frontend/e2e/pantry_management.spec.ts",
        "docs/screenshots/01_dashboard.png",
        "docs/screenshots/02_pantry_inventory.png",
        "docs/screenshots/03_recipe_discovery.png",
        "docs/screenshots/04_recipe_detail_modal.png",
        "docs/screenshots/05_shopping_list.png",
        "docs/screenshots/06_weekly_planner.png",
        "docs/screenshots/07_dark_mode_dashboard.png",
        "docs/screenshots/08_mobile_responsive.png"
    ]
    missing_files = []
    for req in required_files:
        p = os.path.join(TEMP_EXTRACT_DIR, req.replace("/", os.sep))
        if os.path.exists(p):
            print(f"[PASS] Found: {req}")
        else:
            missing_files.append(req)
            print(f"[FAIL] Missing: {req}")

    # 5. Verify backend database initialization and seeding in clean environment
    print("\n--- Verification: Testing Database Initialization from Clean Source ---")
    python_exe = sys.executable
    test_db_script = """
import os, sys
os.environ["DATABASE_URL"] = "sqlite:///./temp_test_verify.db"
sys.path.insert(0, ".")
from app.database import Base, engine, ensure_db_migrations
from app.seed_data import seed_initial_data
Base.metadata.create_all(bind=engine)
ensure_db_migrations(engine)
seed_initial_data()

from app.database import SessionLocal
from app.models import Recipe, User, PantryItem
db = SessionLocal()
recipe_count = db.query(Recipe).count()
user_count = db.query(User).count()
print(f"VERIFY_OK: Seeded {recipe_count} recipes and {user_count} initial user")
assert recipe_count >= 20, "Expected at least 20 recipes"
assert user_count >= 1, "Expected at least 1 user"
db.close()
"""
    backend_extracted = os.path.join(TEMP_EXTRACT_DIR, "backend")
    proc = subprocess.run(
        [python_exe, "-c", test_db_script],
        cwd=backend_extracted,
        capture_output=True,
        text=True
    )
    print("Process stdout:", proc.stdout.strip())
    if proc.stderr:
        print("Process stderr:", proc.stderr.strip())

    db_success = proc.returncode == 0 and "VERIFY_OK" in proc.stdout
    print(f"Database Initialization Verification: {'SUCCESS' if db_success else 'FAILED'}")

    # Summary
    print("\n=== VERIFICATION SUMMARY ===")
    print(f"Archive file: {ZIP_PATH}")
    print(f"Extracted to: {TEMP_EXTRACT_DIR}")
    print(f"Forbidden files detected: {len(exclusion_failures)}")
    print(f"Missing required files: {len(missing_files)}")
    print(f"Database bootstrap test: {'PASSED' if db_success else 'FAILED'}")

    all_passed = (len(exclusion_failures) == 0) and (len(missing_files) == 0) and db_success
    if all_passed:
        print("\nALL VERIFICATION CHECKS PASSED PERFECTLY!")
    else:
        print("\nVERIFICATION FAILED WITH ISSUES.")
        sys.exit(1)

if __name__ == "__main__":
    verify()

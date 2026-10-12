import os
import zipfile
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ZIP_NAME = "PantryPal-FullStack.zip"
ZIP_PATH = os.path.join(PROJECT_ROOT, ZIP_NAME)

EXCLUDED_DIRS = {
    "node_modules",
    "venv",
    ".venv",
    "__pycache__",
    ".pytest_cache",
    ".cache",
    "dist",
    "test-results",
    "playwright-report",
    ".git",
    ".system_generated",
    "pantrypal_data"
}

EXCLUDED_EXTENSIONS = {
    ".pyc",
    ".pyo",
    ".pyd",
    ".db",
    ".db-journal",
    ".sqlite",
    ".sqlite3",
    ".log"
}

EXCLUDED_FILES = {
    ".env",
    "pantrypal.db",
    "pantrypal_backup.db",
    "package_zip.py"
}

def should_exclude(rel_path):
    parts = rel_path.replace("\\", "/").split("/")
    # Check directory exclusions
    for p in parts:
        if p in EXCLUDED_DIRS:
            return True
        if p.startswith(".git"):
            return True

    filename = os.path.basename(rel_path)
    if filename in EXCLUDED_FILES:
        return True

    # Do not package the zip into itself
    if filename == ZIP_NAME:
        return True

    _, ext = os.path.splitext(filename)
    if ext.lower() in EXCLUDED_EXTENSIONS:
        return True

    return False

def make_archive():
    print(f"Creating archive: {ZIP_PATH} from {PROJECT_ROOT}...")
    file_count = 0
    total_uncompressed_bytes = 0

    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(PROJECT_ROOT):
            # Prune directories in place
            dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS and not d.startswith(".git")]

            for file in files:
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, PROJECT_ROOT)

                if should_exclude(rel_path):
                    continue

                zf.write(abs_path, arcname=rel_path)
                file_count += 1
                total_uncompressed_bytes += os.path.getsize(abs_path)

    zip_size_bytes = os.path.getsize(ZIP_PATH)
    print(f"Archive created successfully!")
    print(f"Total files packaged: {file_count}")
    print(f"Uncompressed size: {total_uncompressed_bytes / (1024*1024):.2f} MB")
    print(f"Compressed ZIP size: {zip_size_bytes / (1024*1024):.2f} MB")
    return ZIP_PATH

if __name__ == "__main__":
    make_archive()

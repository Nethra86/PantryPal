import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

# Database path in the backend directory
DB_FILE = os.getenv("DATABASE_FILE", "pantrypal.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_FILE}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    echo=False
)

# Enable Foreign Key support in SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

from sqlalchemy import text

def ensure_db_migrations(db_engine=None):
    if db_engine is None:
        db_engine = engine
    try:
        with db_engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            col_names = [r[1] for r in result]
            if col_names:
                if "theme_preference" not in col_names:
                    conn.execute(text("ALTER TABLE users ADD COLUMN theme_preference VARCHAR(20) DEFAULT 'system'"))
                if "dietary_preferences" not in col_names:
                    conn.execute(text("ALTER TABLE users ADD COLUMN dietary_preferences VARCHAR(255) DEFAULT ''"))
                if "preferred_unit" not in col_names:
                    conn.execute(text("ALTER TABLE users ADD COLUMN preferred_unit VARCHAR(20) DEFAULT 'metric'"))
                conn.commit()
    except Exception:
        pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app
from app.seed_data import seed_initial_data

# Use a test SQLite database
TEST_DB_URL = "sqlite:///./test_pantrypal.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    
    # Override get_db
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    
    # Run seed on test database
    test_db = TestingSessionLocal()
    try:
        seed_initial_data(test_db)
    finally:
        test_db.close()

    yield
    # Cleanup test db
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_pantrypal.db"):
        try:
            os.remove("./test_pantrypal.db")
        except Exception:
            pass

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def auth_client(client):
    from app.auth import auth_rate_limiter
    auth_rate_limiter.reset("testclient")
    resp = client.post("/api/auth/login", json={
        "email": "rowan@kitchen.local",
        "password": "Password123!"
    })
    csrf_token = resp.json()["csrf_token"]
    client.headers["X-CSRF-Token"] = csrf_token
    return client

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def db(db_session):
    return db_session

@pytest.fixture
def test_user(db_session):
    from app import models
    user = db_session.query(models.User).filter(models.User.email == "rowan@kitchen.local").first()
    return user

@pytest.fixture
def fresh_user(db_session):
    import uuid
    from app import models
    from app.auth import hash_password
    unique_email = f"matcher_{uuid.uuid4().hex[:8]}@test.local"
    user = models.User(email=unique_email, name="Matcher Tester", hashed_password=hash_password("Pass123!"))
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


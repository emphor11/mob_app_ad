from sqlalchemy import text
from app.db.session import engine, SessionLocal
from app.db.base import Base, UUIDModel
from app.dependencies.db import get_db


def test_database_connection():
    """Verify that the application engine can connect and execute queries on PostgreSQL."""
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1 AS alive"))
        row = result.fetchone()
        assert row is not None
        assert row[0] == 1


def test_session_lifecycle():
    """Verify that SessionLocal creates valid sessions and closes cleanly."""
    session = SessionLocal()
    try:
        result = session.execute(text("SELECT current_database()"))
        db_name = result.scalar()
        assert db_name == "smartquote_db"
    finally:
        session.close()


def test_get_db_dependency():
    """Verify that the FastAPI get_db dependency yields a valid session."""
    db_generator = get_db()
    db = next(db_generator)
    assert db is not None
    assert db.is_active
    try:
        result = db.execute(text("SELECT 100"))
        assert result.scalar() == 100
    finally:
        try:
            next(db_generator)
        except StopIteration:
            pass


def test_uuid_model_declarative_base():
    """Verify that UUIDModel has id, created_at, and updated_at configured."""
    assert hasattr(UUIDModel, "id")
    assert hasattr(UUIDModel, "created_at")
    assert hasattr(UUIDModel, "updated_at")
    assert Base.metadata is not None

import uuid
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, UUIDModel


class SampleEntity(UUIDModel):
    """Concrete model for testing SQLAlchemy 2.0 base class mapping."""

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)


def test_model_table_name_generation():
    """Verify automatic table naming in BaseDeclarative."""
    assert SampleEntity.__tablename__ == "sampleentitys"


def test_model_instantiation():
    """Verify that models generate default UUIDs and initialize properties."""
    item = SampleEntity(name="PVC Pipe 2-inch", quantity=10)
    assert item.name == "PVC Pipe 2-inch"
    assert item.quantity == 10
    assert item.id is not None
    assert isinstance(item.id, uuid.UUID)


def test_model_column_mappings():
    """Verify modern SQLAlchemy 2.0 mapped columns exist on metadata."""
    columns = SampleEntity.__table__.columns
    assert "id" in columns
    assert "name" in columns
    assert "quantity" in columns
    assert "created_at" in columns
    assert "updated_at" in columns
    assert columns["id"].primary_key is True

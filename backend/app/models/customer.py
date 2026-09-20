import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import UUIDModel

if TYPE_CHECKING:
    from app.models.business import Business


class Customer(UUIDModel):
    """
    Customer entity scoped strictly to a specific business.
    Represents clients of trade contractors / freelancers (e.g. builders, homeowners, shops).
    """

    __tablename__ = "customers"

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        index=True,
        nullable=False,
    )

    phone: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False,
    )

    email: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    address: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )

    gstin: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="customers")

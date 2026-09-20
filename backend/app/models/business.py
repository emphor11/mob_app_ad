import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import UUIDModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.customer import Customer
    from app.models.quotation import Quotation
    from app.models.invoice import Invoice





class Business(UUIDModel):
    """
    Business entity representing a trade contractor / freelancer shop or company.
    Designed to support 1 user -> multiple businesses in the future by using a foreign key
    with an `is_default` flag and indexing on `user_id`.
    """

    __tablename__ = "businesses"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    owner_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    phone: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    address: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    gstin: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    logo_url: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
    )

    currency: Mapped[str] = mapped_column(
        String(10),
        default="₹",
        nullable=False,
    )

    is_default: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="businesses")
    customers: Mapped[list["Customer"]] = relationship(
        "Customer",
        back_populates="business",
        cascade="all, delete-orphan",
    )
    quotations: Mapped[list["Quotation"]] = relationship(
        "Quotation",
        back_populates="business",
        cascade="all, delete-orphan",
    )
    invoices: Mapped[list["Invoice"]] = relationship(
        "Invoice",
        back_populates="business",
        cascade="all, delete-orphan",
    )




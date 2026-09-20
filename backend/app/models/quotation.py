import enum
import uuid
from datetime import date
from decimal import Decimal
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Date, Numeric, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import UUIDModel

if TYPE_CHECKING:
    from app.models.business import Business
    from app.models.customer import Customer


class QuotationStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    CONVERTED = "CONVERTED"


class Quotation(UUIDModel):
    """
    Commercial quotation entity.
    Enforces Rule 4 (Financial Exact Decimals): All currency and subtotal columns
    use NUMERIC(12, 2) rather than floating point numbers.
    """

    __tablename__ = "quotations"

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )

    quotation_number: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False,
    )

    issue_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    valid_until: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    status: Mapped[QuotationStatus] = mapped_column(
        SQLEnum(QuotationStatus, name="quotation_status_enum"),
        default=QuotationStatus.DRAFT,
        index=True,
        nullable=False,
    )

    # Financial figures - Strict NUMERIC(12, 2)
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0.00"),
        nullable=False,
    )

    discount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0.00"),
        nullable=False,
    )

    tax: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0.00"),
        nullable=False,
    )

    total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0.00"),
        nullable=False,
    )

    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    terms: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="quotations")
    customer: Mapped["Customer"] = relationship("Customer", back_populates="quotations")
    items: Mapped[list["QuotationItem"]] = relationship(
        "QuotationItem",
        back_populates="quotation",
        cascade="all, delete-orphan",
        order_by="QuotationItem.created_at.asc()",
    )


class QuotationItem(UUIDModel):
    """
    Individual line item for a quotation.
    Quantities, unit prices, tax rates, tax amounts, and line totals all use NUMERIC(12, 2).
    """

    __tablename__ = "quotation_items"

    quotation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quotations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    quantity: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("1.00"),
        nullable=False,
    )

    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0.00"),
        nullable=False,
    )

    tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0.00"),
        nullable=False,
    )

    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0.00"),
        nullable=False,
    )

    line_total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0.00"),
        nullable=False,
    )

    # Relationships
    quotation: Mapped["Quotation"] = relationship("Quotation", back_populates="items")

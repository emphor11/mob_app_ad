import enum
import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import UUIDModel

if TYPE_CHECKING:
    from app.models.business import Business
    from app.models.invoice import Invoice


class ReminderChannel(str, enum.Enum):
    WHATSAPP = "WHATSAPP"
    SMS = "SMS"
    SHARE = "SHARE"
    EMAIL = "EMAIL"


class InvoiceReminder(UUIDModel):
    """
    Log of payment reminders sent for an invoice.
    Tracks channel, recipient contact, message text, and timestamp.
    """

    __tablename__ = "invoice_reminders"

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    channel: Mapped[ReminderChannel] = mapped_column(
        SQLEnum(ReminderChannel, name="reminder_channel_enum"),
        default=ReminderChannel.WHATSAPP,
        nullable=False,
    )

    recipient_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    recipient_phone: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    business: Mapped["Business"] = relationship("Business")
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="reminders")

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.invoice import InvoiceStatus
from app.models.reminder import ReminderChannel


class ReminderTemplateResponse(BaseModel):
    """
    Template response containing pre-calculated financial balances,
    formatted message variants, and ready-to-use WhatsApp deep link.
    """
    invoice_id: uuid.UUID
    customer_id: uuid.UUID
    customer_name: str
    customer_phone: Optional[str] = None
    invoice_number: str
    due_date: date
    total_amount: Decimal
    paid_amount: Decimal
    remaining_amount: Decimal
    status: InvoiceStatus
    standard_message: str
    gentle_message: str
    urgent_message: str
    whatsapp_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class InvoiceReminderCreate(BaseModel):
    """Payload to log a reminder dispatch."""
    channel: ReminderChannel = ReminderChannel.WHATSAPP
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None
    message: str


class InvoiceReminderResponse(BaseModel):
    """Reminder log response model."""
    id: uuid.UUID
    business_id: uuid.UUID
    invoice_id: uuid.UUID
    channel: ReminderChannel
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None
    message: str
    sent_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DueAlertItem(BaseModel):
    """Individual invoice due alert."""
    invoice_id: uuid.UUID
    invoice_number: str
    customer_id: uuid.UUID
    customer_name: str
    customer_phone: Optional[str] = None
    due_date: date
    total_amount: Decimal
    remaining_amount: Decimal
    status: InvoiceStatus
    alert_type: str  # 'DUE_TOMORROW' or 'OVERDUE'
    days_offset: int  # 1 for tomorrow, negative integer for overdue days
    suggested_message: str


class DueAlertsResponse(BaseModel):
    """Response containing automated due alert items."""
    due_tomorrow_count: int
    overdue_count: int
    total_alerts: int
    alerts: List[DueAlertItem]

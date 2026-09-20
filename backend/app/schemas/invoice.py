import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.invoice import InvoiceStatus
from app.schemas.payment import PaymentResponse


# -------------------------------------------------------------
# Invoice Item Schemas
# -------------------------------------------------------------

class InvoiceItemResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    description: str
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    line_total: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Invoice Schemas
# -------------------------------------------------------------

class InvoiceBase(BaseModel):
    customer_id: uuid.UUID
    issue_date: date
    due_date: date
    subtotal: Decimal
    discount: Decimal = Decimal("0.00")
    tax: Decimal = Decimal("0.00")
    total: Decimal
    paid_amount: Decimal = Decimal("0.00")
    status: InvoiceStatus = InvoiceStatus.UNPAID
    notes: Optional[str] = None
    terms: Optional[str] = None


class InvoiceResponse(InvoiceBase):
    id: uuid.UUID
    business_id: uuid.UUID
    quotation_id: Optional[uuid.UUID] = None
    invoice_number: str
    customer_name: Optional[str] = None
    items: List[InvoiceItemResponse] = []
    payments: List[PaymentResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConvertQuotationRequest(BaseModel):
    due_days: int = Field(default=15, ge=0, le=365, description="Days from today when the invoice is due")
    issue_date: Optional[date] = Field(None, description="Optional custom issue date (defaults to today)")
    notes: Optional[str] = Field(None, description="Optional overridden notes for invoice")
    terms: Optional[str] = Field(None, description="Optional overridden terms for invoice")


class InvoiceUpdate(BaseModel):
    status: Optional[InvoiceStatus] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    terms: Optional[str] = None


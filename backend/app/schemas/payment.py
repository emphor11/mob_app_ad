import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.payment import PaymentMethod


class PaymentCreate(BaseModel):
    amount: Decimal = Field(..., gt=Decimal("0.00"), decimal_places=2, description="Payment amount in INR")
    payment_date: date = Field(default_factory=date.today, description="Date payment was received")
    method: PaymentMethod = Field(default=PaymentMethod.UPI, description="Payment method used")
    reference: Optional[str] = Field(None, max_length=100, description="Transaction ID / UTR / Cheque reference")
    notes: Optional[str] = Field(None, description="Optional payment notes")


class PaymentResponse(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    invoice_id: uuid.UUID
    invoice_number: Optional[str] = None
    customer_name: Optional[str] = None
    amount: Decimal
    payment_date: date
    method: PaymentMethod
    reference: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

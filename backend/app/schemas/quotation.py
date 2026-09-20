import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.quotation import QuotationStatus


# -------------------------------------------------------------
# Quotation Item Schemas
# -------------------------------------------------------------

class QuotationItemBase(BaseModel):
    description: str = Field(..., min_length=1, max_length=500, description="Item or service description")
    quantity: Decimal = Field(default=Decimal("1.00"), ge=Decimal("0.01"), description="Quantity in trade units")
    unit_price: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="Unit price before tax")
    tax_rate: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), le=Decimal("100.00"), description="Tax rate percentage (e.g. 18.00 for 18% GST)")


class QuotationItemCreate(QuotationItemBase):
    pass


class QuotationItemResponse(QuotationItemBase):
    id: uuid.UUID
    quotation_id: uuid.UUID
    tax_amount: Decimal
    line_total: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Quotation Schemas
# -------------------------------------------------------------

class QuotationBase(BaseModel):
    customer_id: uuid.UUID
    quotation_number: str = Field(..., min_length=1, max_length=50, description="e.g. QT-2026-0001")
    issue_date: date
    valid_until: date
    discount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="Overall discount amount")
    notes: Optional[str] = None
    terms: Optional[str] = None


class QuotationCreate(QuotationBase):
    items: List[QuotationItemCreate] = Field(..., min_length=1, description="Line items for the quotation")


class QuotationUpdate(BaseModel):
    issue_date: Optional[date] = None
    valid_until: Optional[date] = None
    status: Optional[QuotationStatus] = None
    discount: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    notes: Optional[str] = None
    terms: Optional[str] = None
    items: Optional[List[QuotationItemCreate]] = None


class QuotationResponse(QuotationBase):
    id: uuid.UUID
    business_id: uuid.UUID
    status: QuotationStatus
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal
    items: List[QuotationItemResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

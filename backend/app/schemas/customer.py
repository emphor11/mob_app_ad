import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Client or company name")
    phone: str = Field(..., min_length=5, max_length=50, description="Primary contact phone number")
    email: Optional[str] = Field(None, max_length=255, description="Client email address")
    address: Optional[str] = Field(None, max_length=500, description="Site or billing address")
    gstin: Optional[str] = Field(None, max_length=50, description="Optional GST identification number")
    notes: Optional[str] = Field(None, description="Notes on trade preferences, billing terms, etc.")


class CustomerCreate(CustomerBase):
    """Payload to create customer. business_id is purposely omitted and inferred from session."""
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, min_length=5, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = Field(None, max_length=500)
    gstin: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None


class CustomerResponse(CustomerBase):
    id: uuid.UUID
    business_id: uuid.UUID
    total_billed: Decimal = Field(default=Decimal("0.00"), description="Total invoiced amount")
    outstanding_balance: Decimal = Field(default=Decimal("0.00"), description="Remaining unpaid balance")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

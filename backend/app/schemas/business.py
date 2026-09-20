import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class BusinessBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Business name")
    owner_name: str = Field(..., min_length=2, max_length=255, description="Owner / Proprietor name")
    phone: str = Field(..., min_length=7, max_length=50, description="Business phone number")
    email: str = Field(..., min_length=3, max_length=255, description="Business email address")
    address: str = Field(..., min_length=3, max_length=500, description="Physical shop / office address")
    gstin: Optional[str] = Field(None, max_length=50, description="Optional GSTIN")
    logo_url: Optional[str] = Field(None, max_length=1000, description="Optional business logo URI/URL")
    currency: str = Field(default="₹", max_length=10, description="Currency symbol")


class BusinessCreate(BusinessBase):
    pass


class BusinessUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    owner_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, min_length=7, max_length=50)
    email: Optional[str] = Field(None, min_length=3, max_length=255)
    address: Optional[str] = Field(None, min_length=3, max_length=500)
    gstin: Optional[str] = Field(None, max_length=50)
    logo_url: Optional[str] = Field(None, max_length=1000)
    currency: Optional[str] = Field(None, max_length=10)
    is_default: Optional[bool] = None


class BusinessResponse(BusinessBase):
    id: uuid.UUID
    user_id: uuid.UUID
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

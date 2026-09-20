import uuid
from datetime import date
from decimal import Decimal
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict

from app.models.invoice import InvoiceStatus


PaymentCategory = Literal["PENDING", "OVERDUE", "PAID"]


class OutstandingMetrics(BaseModel):
    total_outstanding: Decimal
    total_overdue: Decimal
    total_partially_paid: Decimal
    total_paid: Decimal
    outstanding_count: int
    overdue_count: int
    partially_paid_count: int
    paid_count: int


class OutstandingInvoiceItem(BaseModel):
    id: uuid.UUID
    invoice_number: str
    customer_id: uuid.UUID
    customer_name: str
    customer_phone: Optional[str] = None
    issue_date: date
    due_date: date
    subtotal: Decimal
    tax: Decimal
    total: Decimal
    paid_amount: Decimal
    outstanding_balance: Decimal
    status: InvoiceStatus
    is_overdue: bool
    payment_category: PaymentCategory

    model_config = ConfigDict(from_attributes=True)


class OutstandingSummaryResponse(BaseModel):
    metrics: OutstandingMetrics
    items: List[OutstandingInvoiceItem]

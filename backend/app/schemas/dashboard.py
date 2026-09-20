import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.quotation import QuotationStatus
from app.models.invoice import InvoiceStatus
from app.models.payment import PaymentMethod


class DashboardMetrics(BaseModel):
    """Aggregated financial KPIs and business entity counts."""
    total_sales: Decimal
    total_collected: Decimal
    outstanding: Decimal
    overdue: Decimal
    customers_count: int
    quotations_count: int
    invoices_count: int


class RecentQuotationItem(BaseModel):
    id: uuid.UUID
    quotation_number: str
    customer_id: uuid.UUID
    customer_name: str
    total: Decimal
    status: QuotationStatus
    issue_date: date
    valid_until: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecentInvoiceItem(BaseModel):
    id: uuid.UUID
    invoice_number: str
    customer_id: uuid.UUID
    customer_name: str
    total: Decimal
    paid_amount: Decimal
    remaining_amount: Decimal
    status: InvoiceStatus
    issue_date: date
    due_date: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecentPaymentItem(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    invoice_number: str
    customer_name: str
    amount: Decimal
    method: PaymentMethod
    payment_date: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OverdueInvoiceItem(BaseModel):
    id: uuid.UUID
    invoice_number: str
    customer_id: uuid.UUID
    customer_name: str
    customer_phone: Optional[str] = None
    total: Decimal
    paid_amount: Decimal
    remaining_amount: Decimal
    due_date: date
    days_overdue: int

    model_config = ConfigDict(from_attributes=True)


class DashboardResponse(BaseModel):
    business_id: uuid.UUID
    business_name: str
    owner_name: str
    metrics: DashboardMetrics
    recent_quotations: List[RecentQuotationItem]
    recent_invoices: List[RecentInvoiceItem]
    recent_payments: List[RecentPaymentItem]
    overdue_invoices: List[OverdueInvoiceItem]

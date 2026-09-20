import uuid
from datetime import date
from decimal import Decimal
from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.dependencies.db import get_db
from app.dependencies.business import get_current_business
from app.models.business import Business
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment, PaymentMethod
from app.schemas.payment import PaymentResponse
from app.schemas.outstanding import (
    OutstandingMetrics,
    OutstandingInvoiceItem,
    OutstandingSummaryResponse,
    PaymentCategory,
)

router = APIRouter()


@router.get(
    "/",
    summary="Payments service status",
)
def get_payments_status():
    return {
        "status": "ready",
        "service": "payments",
        "message": "Payments router active with overpayment validation and tracking.",
    }


@router.get("/outstanding", response_model=OutstandingSummaryResponse)
def get_outstanding_summary(
    filter_category: Optional[Literal["ALL", "PENDING", "OVERDUE", "PAID"]] = Query("ALL", alias="filter", description="Category filter"),
    search: Optional[str] = Query(None, description="Search by customer name or invoice number"),
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Returns aggregated metrics and categorized invoices for outstanding payments.
    Dynamically identifies OVERDUE (due_date < today with remaining balance),
    PENDING (due_date >= today with remaining balance), and PAID invoices.
    Strictly scoped to current business.
    """
    today = date.today()
    stmt = (
        select(Invoice)
        .join(Customer, Invoice.customer_id == Customer.id)
        .where(
            Invoice.business_id == current_business.id,
            Invoice.status != InvoiceStatus.CANCELLED,
        )
    )
    invoices = list(db.scalars(stmt).all())

    total_outstanding = Decimal("0.00")
    total_overdue = Decimal("0.00")
    total_partially_paid = Decimal("0.00")
    total_paid = Decimal("0.00")
    outstanding_count = 0
    overdue_count = 0
    partially_paid_count = 0
    paid_count = 0

    categorized_items: List[OutstandingInvoiceItem] = []

    for inv in invoices:
        balance = max(Decimal("0.00"), inv.total - inv.paid_amount)
        is_overdue = (balance > Decimal("0.00")) and (inv.due_date < today)
        total_paid += inv.paid_amount

        # Categorize
        if balance <= Decimal("0.00"):
            category: PaymentCategory = "PAID"
            paid_count += 1
        elif is_overdue:
            category: PaymentCategory = "OVERDUE"
            overdue_count += 1
            total_overdue += balance
            outstanding_count += 1
            total_outstanding += balance
            if inv.paid_amount > Decimal("0.00"):
                partially_paid_count += 1
                total_partially_paid += balance
        else:
            category: PaymentCategory = "PENDING"
            outstanding_count += 1
            total_outstanding += balance
            if inv.paid_amount > Decimal("0.00"):
                partially_paid_count += 1
                total_partially_paid += balance

        cust_name = inv.customer.name if inv.customer else "Client"
        cust_phone = inv.customer.phone if inv.customer else None

        item = OutstandingInvoiceItem(
            id=inv.id,
            invoice_number=inv.invoice_number,
            customer_id=inv.customer_id,
            customer_name=cust_name,
            customer_phone=cust_phone,
            issue_date=inv.issue_date,
            due_date=inv.due_date,
            subtotal=inv.subtotal,
            tax=inv.tax,
            total=inv.total,
            paid_amount=inv.paid_amount,
            outstanding_balance=balance,
            status=inv.status,
            is_overdue=is_overdue,
            payment_category=category,
        )
        categorized_items.append(item)

    # Filter items
    filtered = categorized_items
    if filter_category and filter_category != "ALL":
        filtered = [item for item in filtered if item.payment_category == filter_category]

    # Search filter
    if search and search.strip():
        term = search.strip().lower()
        filtered = [
            item for item in filtered
            if term in item.customer_name.lower() or term in item.invoice_number.lower()
        ]

    # Sort: OVERDUE first (by due_date asc), then PENDING (by due_date asc), then PAID (by issue_date desc)
    def sort_key(x: OutstandingInvoiceItem):
        cat_order = {"OVERDUE": 0, "PENDING": 1, "PAID": 2}
        return (cat_order.get(x.payment_category, 3), x.due_date)

    filtered.sort(key=sort_key)

    metrics = OutstandingMetrics(
        total_outstanding=total_outstanding,
        total_overdue=total_overdue,
        total_partially_paid=total_partially_paid,
        total_paid=total_paid,
        outstanding_count=outstanding_count,
        overdue_count=overdue_count,
        partially_paid_count=partially_paid_count,
        paid_count=paid_count,
    )

    return OutstandingSummaryResponse(
        metrics=metrics,
        items=filtered,
    )


@router.get("", response_model=List[PaymentResponse])
def list_payments(
    invoice_id: Optional[uuid.UUID] = Query(None, description="Filter by invoice ID"),
    method: Optional[PaymentMethod] = Query(None, description="Filter by payment method"),
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    List all payment transactions across all invoices strictly scoped to current business.
    Supports filtering by invoice_id and payment method.
    """
    stmt = (
        select(Payment)
        .join(Invoice, Payment.invoice_id == Invoice.id)
        .where(Payment.business_id == current_business.id)
    )

    if invoice_id:
        stmt = stmt.where(Payment.invoice_id == invoice_id)

    if method:
        stmt = stmt.where(Payment.method == method)

    stmt = stmt.order_by(Payment.payment_date.desc(), Payment.created_at.desc())
    payments = list(db.scalars(stmt).all())

    result = []
    for p in payments:
        res = PaymentResponse.model_validate(p)
        res.invoice_number = p.invoice.invoice_number if p.invoice else None
        res.customer_name = p.invoice.customer.name if (p.invoice and p.invoice.customer) else None
        result.append(res)
    return result

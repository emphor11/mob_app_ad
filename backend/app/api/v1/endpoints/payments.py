import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.dependencies.db import get_db
from app.dependencies.business import get_current_business
from app.models.business import Business
from app.models.invoice import Invoice
from app.models.payment import Payment, PaymentMethod
from app.schemas.payment import PaymentResponse

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

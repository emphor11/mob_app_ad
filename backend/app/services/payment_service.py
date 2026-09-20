import uuid
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment
from app.schemas.payment import PaymentCreate


def record_invoice_payment(
    db: Session,
    business_id: uuid.UUID,
    invoice_id: uuid.UUID,
    payload: PaymentCreate,
) -> Payment:
    """
    Atomically records a payment against an invoice.
    Enforces:
    - Business scoping (tenant isolation)
    - Invoice exists and is not CANCELLED
    - Strict overpayment prevention: payment.amount <= remaining balance
    - Exact NUMERIC(12, 2) arithmetic
    - Automatic invoice status update:
        * paid_amount == total -> PAID
        * 0 < paid_amount < total -> PARTIALLY_PAID
        * paid_amount == 0 -> UNPAID
    """
    stmt = select(Invoice).where(
        Invoice.id == invoice_id,
        Invoice.business_id == business_id,
    )
    invoice = db.scalars(stmt).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found.",
        )

    if invoice.status == InvoiceStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot record payment on a cancelled invoice.",
        )

    remaining = invoice.total - invoice.paid_amount

    # Critical Validation: Never allow overpayments
    if payload.amount > remaining:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount ₹{payload.amount:.2f} exceeds remaining balance of ₹{remaining:.2f} on invoice {invoice.invoice_number}.",
        )

    payment = Payment(
        business_id=business_id,
        invoice_id=invoice.id,
        amount=payload.amount,
        payment_date=payload.payment_date,
        method=payload.method,
        reference=payload.reference,
        notes=payload.notes,
    )
    db.add(payment)

    # Update paid amount on invoice
    invoice.paid_amount = invoice.paid_amount + payload.amount

    # Automatic status state machine
    if invoice.paid_amount >= invoice.total:
        invoice.status = InvoiceStatus.PAID
    elif invoice.paid_amount > Decimal("0.00"):
        invoice.status = InvoiceStatus.PARTIALLY_PAID
    else:
        invoice.status = InvoiceStatus.UNPAID

    db.commit()
    db.refresh(payment)
    db.refresh(invoice)

    return payment

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_

from app.dependencies.db import get_db
from app.dependencies.business import get_current_business
from app.models.business import Business
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment
from app.schemas.invoice import InvoiceResponse, InvoiceUpdate
from app.schemas.payment import PaymentCreate, PaymentResponse
from app.services.pdf_generator import generate_invoice_pdf
from app.services.payment_service import record_invoice_payment


router = APIRouter()


@router.get(
    "/",
    summary="Invoices service status",
)
def invoices_status():
    return {
        "status": "ready",
        "service": "invoices",
        "endpoints": ["/", "/{id}"],
    }


@router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    status_filter: Optional[InvoiceStatus] = Query(None, alias="status", description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by invoice number or customer name"),
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    List all invoices scoped strictly to the current authenticated business.
    Supports filtering by invoice status and search by invoice number or customer name.
    """
    stmt = (
        select(Invoice)
        .join(Customer, Invoice.customer_id == Customer.id)
        .where(Invoice.business_id == current_business.id)
    )

    if status_filter:
        stmt = stmt.where(Invoice.status == status_filter)

    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Invoice.invoice_number.ilike(term),
                Customer.name.ilike(term),
            )
        )

    stmt = stmt.order_by(Invoice.created_at.desc())
    invoices = list(db.scalars(stmt).all())

    result = []
    for inv in invoices:
        res = InvoiceResponse.model_validate(inv)
        res.customer_name = inv.customer.name if inv.customer else None
        result.append(res)
    return result


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: uuid.UUID,
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Retrieve single invoice details with line items.
    Strictly scoped to current business.
    """
    stmt = select(Invoice).where(
        Invoice.id == invoice_id,
        Invoice.business_id == current_business.id,
    )
    invoice = db.scalars(stmt).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found.",
        )

    res = InvoiceResponse.model_validate(invoice)
    res.customer_name = invoice.customer.name if invoice.customer else None
    return res


@router.get(
    "/{invoice_id}/pdf",
    summary="Download Invoice PDF",
    response_class=Response,
)
def download_invoice_pdf(
    invoice_id: uuid.UUID,
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Generate and stream an A4 Tax Invoice PDF document.
    Strictly scoped to current business.
    """
    stmt = select(Invoice).where(
        Invoice.id == invoice_id,
        Invoice.business_id == current_business.id,
    )
    invoice = db.scalars(stmt).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found.",
        )

    pdf_bytes = generate_invoice_pdf(
        invoice=invoice,
        business=current_business,
        customer=invoice.customer,
    )

    filename = f"{invoice.invoice_number}.pdf"
    headers = {
        "Content-Disposition": f'inline; filename="{filename}"',
        "Content-Type": "application/pdf",
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: uuid.UUID,
    payload: InvoiceUpdate,
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Update invoice status (e.g. CANCELLED, OVERDUE, PAID), due date, notes, or terms.
    Strictly scoped to current business.
    """
    stmt = select(Invoice).where(
        Invoice.id == invoice_id,
        Invoice.business_id == current_business.id,
    )
    invoice = db.scalars(stmt).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found.",
        )

    if payload.status is not None:
        invoice.status = payload.status

    if payload.due_date is not None:
        invoice.due_date = payload.due_date

    if payload.notes is not None:
        invoice.notes = payload.notes

    if payload.terms is not None:
        invoice.terms = payload.terms

    db.commit()
    db.refresh(invoice)

    res = InvoiceResponse.model_validate(invoice)
    res.customer_name = invoice.customer.name if invoice.customer else None
    return res


@router.post(
    "/{invoice_id}/payments",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a payment against an invoice",
)
def create_invoice_payment(
    invoice_id: uuid.UUID,
    payload: PaymentCreate,
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Record payment against an invoice.
    Enforces overpayment prevention and automatically updates invoice status (UNPAID -> PARTIALLY_PAID -> PAID).
    Strictly scoped to current business.
    """
    payment = record_invoice_payment(
        db=db,
        business_id=current_business.id,
        invoice_id=invoice_id,
        payload=payload,
    )
    res = PaymentResponse.model_validate(payment)
    res.invoice_number = payment.invoice.invoice_number if payment.invoice else None
    res.customer_name = payment.invoice.customer.name if (payment.invoice and payment.invoice.customer) else None
    return res


@router.get(
    "/{invoice_id}/payments",
    response_model=List[PaymentResponse],
    summary="List payments for an invoice",
)
def get_invoice_payments(
    invoice_id: uuid.UUID,
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    List all payments recorded against a specific invoice.
    Strictly scoped to current business.
    """
    stmt_inv = select(Invoice).where(
        Invoice.id == invoice_id,
        Invoice.business_id == current_business.id,
    )
    invoice = db.scalars(stmt_inv).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found.",
        )

    stmt = (
        select(Payment)
        .where(
            Payment.invoice_id == invoice_id,
            Payment.business_id == current_business.id,
        )
        .order_by(Payment.payment_date.desc(), Payment.created_at.desc())
    )
    payments = list(db.scalars(stmt).all())

    result = []
    for p in payments:
        res = PaymentResponse.model_validate(p)
        res.invoice_number = invoice.invoice_number
        res.customer_name = invoice.customer.name if invoice.customer else None
        result.append(res)
    return result



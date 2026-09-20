import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_

from app.dependencies.db import get_db
from app.dependencies.business import get_current_business
from app.models.business import Business
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceStatus
from app.schemas.invoice import InvoiceResponse

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

import uuid
from datetime import date, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.models.business import Business
from app.models.quotation import Quotation, QuotationStatus
from app.models.invoice import Invoice, InvoiceItem, InvoiceStatus


def generate_invoice_number(db: Session, business_id: uuid.UUID) -> str:
    """
    Generate sequential human-readable invoice identifier: INV-YYYY-XXXX.
    Supports custom invoice prefix configured per business.
    """
    current_year = date.today().year
    business = db.get(Business, business_id)
    raw_prefix = (business.invoice_prefix if business and business.invoice_prefix else "INV").strip().upper()
    prefix = f"{raw_prefix}-{current_year}-"

    stmt = (
        select(func.count(Invoice.id))
        .where(
            Invoice.business_id == business_id,
            Invoice.invoice_number.like(f"{prefix}%"),
        )
    )
    count = db.scalar(stmt) or 0
    sequence_number = count + 1
    return f"{prefix}{sequence_number:04d}"


def convert_quotation_to_invoice(
    db: Session,
    business_id: uuid.UUID,
    quotation_id: uuid.UUID,
    due_days: int = 15,
    custom_issue_date: Optional[date] = None,
    custom_notes: Optional[str] = None,
    custom_terms: Optional[str] = None,
) -> Invoice:
    """
    Atomically convert an ACCEPTED quotation into a formal Tax Invoice.
    Enforces Critical Business Rule:
    - Verifies quotation is ACCEPTED and belongs to authenticated business.
    - Creates a separate Invoice record with an official INV-YYYY-XXXX number.
    - Deep-copies each line item into `invoice_items` so that future changes
      to the quotation or products never alter the issued invoice.
    - Transitions quotation status to CONVERTED.
    - Executes within a single ACID database transaction.
    """
    stmt = select(Quotation).where(
        Quotation.id == quotation_id,
        Quotation.business_id == business_id,
    )
    quotation = db.scalars(stmt).first()
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found.",
        )

    if quotation.status != QuotationStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only ACCEPTED quotations can be converted to an invoice. Current status is {quotation.status.value}.",
        )

    if quotation.valid_until < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot convert quotation {quotation.quotation_number} because it expired on {quotation.valid_until}. Please extend the quotation validity before converting.",
        )

    issue_date = custom_issue_date or date.today()
    due_date = issue_date + timedelta(days=due_days)

    business = db.get(Business, business_id)
    invoice_number = generate_invoice_number(db, business_id)

    # Create Invoice Header
    invoice = Invoice(
        business_id=business_id,
        customer_id=quotation.customer_id,
        quotation_id=quotation.id,
        invoice_number=invoice_number,
        issue_date=issue_date,
        due_date=due_date,
        status=InvoiceStatus.UNPAID,
        subtotal=quotation.subtotal,
        discount=quotation.discount,
        tax=quotation.tax,
        total=quotation.total,
        paid_amount=quotation.total * 0,  # 0.00 Decimal
        notes=custom_notes if custom_notes is not None else quotation.notes,
        terms=custom_terms if custom_terms is not None else (quotation.terms if quotation.terms else (business.default_terms if business else None)),
    )
    db.add(invoice)
    db.flush()  # Populates invoice.id for child line items

    # Deep copy quotation items -> independent invoice items
    for item in quotation.items:
        inv_item = InvoiceItem(
            invoice_id=invoice.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            tax_rate=item.tax_rate,
            tax_amount=item.tax_amount,
            line_total=item.line_total,
        )
        db.add(inv_item)

    # Transition Quotation status to CONVERTED
    quotation.status = QuotationStatus.CONVERTED

    db.commit()
    db.refresh(invoice)
    return invoice

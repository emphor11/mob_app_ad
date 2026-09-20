import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_

from app.dependencies.db import get_db
from app.dependencies.business import get_current_business
from app.models.business import Business
from app.models.customer import Customer
from app.models.quotation import Quotation, QuotationItem, QuotationStatus
from app.schemas.quotation import QuotationCreate, QuotationUpdate, QuotationResponse
from app.services.quotation_calculator import (
    calculate_quotation_totals,
    generate_quotation_number,
)
from app.services.pdf_generator import generate_quotation_pdf


router = APIRouter()


@router.get(
    "/",
    summary="Quotations service status",
)
def quotations_status():
    """Return status and active quotations endpoints."""
    return {
        "status": "ready",
        "service": "quotations",
        "endpoints": ["/", "/{id}"],
    }


@router.get("", response_model=List[QuotationResponse])
def list_quotations(
    status_filter: Optional[QuotationStatus] = Query(None, alias="status", description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by quotation number or customer name"),
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    List all quotations scoped strictly to the current authenticated business.
    Supports filtering by status (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED, CONVERTED)
    and search by quotation number or customer name.
    """
    stmt = (
        select(Quotation)
        .join(Customer, Quotation.customer_id == Customer.id)
        .where(Quotation.business_id == current_business.id)
    )

    if status_filter:
        stmt = stmt.where(Quotation.status == status_filter)

    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Quotation.quotation_number.ilike(term),
                Customer.name.ilike(term),
            )
        )

    stmt = stmt.order_by(Quotation.created_at.desc())
    quotations = list(db.scalars(stmt).all())

    result = []
    for q in quotations:
        res = QuotationResponse.model_validate(q)
        res.customer_name = q.customer.name if q.customer else None
        result.append(res)
    return result


@router.post("", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
def create_quotation(
    payload: QuotationCreate,
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Create a new quotation with authoritative backend calculation of line items, taxes, and totals.
    Enforces Rule 1 (Server is Authoritative) and Rule 2 (Strict Tenant Isolation).
    """
    customer_stmt = select(Customer).where(
        Customer.id == payload.customer_id,
        Customer.business_id == current_business.id,
    )
    customer = db.scalars(customer_stmt).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found or does not belong to your business.",
        )

    quote_number = (
        payload.quotation_number.strip()
        if payload.quotation_number and payload.quotation_number.strip()
        else generate_quotation_number(db, current_business.id)
    )

    subtotal, total_tax, grand_total, computed_items = calculate_quotation_totals(
        items=payload.items,
        discount=payload.discount,
    )

    quotation = Quotation(
        business_id=current_business.id,
        customer_id=customer.id,
        quotation_number=quote_number,
        issue_date=payload.issue_date,
        valid_until=payload.valid_until,
        status=QuotationStatus.DRAFT,
        subtotal=subtotal,
        discount=payload.discount,
        tax=total_tax,
        total=grand_total,
        notes=payload.notes.strip() if payload.notes else None,
        terms=payload.terms.strip() if payload.terms else None,
    )
    db.add(quotation)
    db.flush()

    for item_data in computed_items:
        item = QuotationItem(
            quotation_id=quotation.id,
            description=item_data["description"],
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            tax_rate=item_data["tax_rate"],
            tax_amount=item_data["tax_amount"],
            line_total=item_data["line_total"],
        )
        db.add(item)

    db.commit()
    db.refresh(quotation)

    res = QuotationResponse.model_validate(quotation)
    res.customer_name = customer.name
    return res


@router.get("/{quotation_id}", response_model=QuotationResponse)
def get_quotation(
    quotation_id: uuid.UUID,
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Retrieve single quotation details with line items.
    Strictly scoped to current business.
    """
    stmt = select(Quotation).where(
        Quotation.id == quotation_id,
        Quotation.business_id == current_business.id,
    )
    quotation = db.scalars(stmt).first()
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found.",
        )

    res = QuotationResponse.model_validate(quotation)
    res.customer_name = quotation.customer.name if quotation.customer else None
    return res


@router.patch("/{quotation_id}", response_model=QuotationResponse)
def update_quotation(
    quotation_id: uuid.UUID,
    payload: QuotationUpdate,
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Update quotation details or status (e.g. mark SENT, ACCEPTED, REJECTED).
    If line items or discount are updated, recalculates financial totals authoritatively.
    Strictly scoped to current business.
    """
    stmt = select(Quotation).where(
        Quotation.id == quotation_id,
        Quotation.business_id == current_business.id,
    )
    quotation = db.scalars(stmt).first()
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found.",
        )

    if payload.issue_date is not None:
        quotation.issue_date = payload.issue_date
    if payload.valid_until is not None:
        quotation.valid_until = payload.valid_until
    if payload.status is not None:
        quotation.status = payload.status
    if payload.notes is not None:
        quotation.notes = payload.notes.strip() if payload.notes else None
    if payload.terms is not None:
        quotation.terms = payload.terms.strip() if payload.terms else None

    # Handle discount and items recalculation
    recalc_needed = False
    new_discount = quotation.discount
    if payload.discount is not None:
        new_discount = payload.discount
        quotation.discount = new_discount
        recalc_needed = True

    if payload.items is not None:
        recalc_needed = True
        # Remove old items
        for old_item in quotation.items:
            db.delete(old_item)
        quotation.items.clear()

        subtotal, total_tax, grand_total, computed_items = calculate_quotation_totals(
            items=payload.items,
            discount=new_discount,
        )
        quotation.subtotal = subtotal
        quotation.tax = total_tax
        quotation.total = grand_total

        for item_data in computed_items:
            item = QuotationItem(
                quotation_id=quotation.id,
                description=item_data["description"],
                quantity=item_data["quantity"],
                unit_price=item_data["unit_price"],
                tax_rate=item_data["tax_rate"],
                tax_amount=item_data["tax_amount"],
                line_total=item_data["line_total"],
            )
            db.add(item)

    elif recalc_needed:
        # Discount changed without changing items, recalculate overall totals
        existing_items = [
            type("ItemMock", (), {
                "description": it.description,
                "quantity": it.quantity,
                "unit_price": it.unit_price,
                "tax_rate": it.tax_rate,
            })()
            for it in quotation.items
        ]
        subtotal, total_tax, grand_total, _ = calculate_quotation_totals(
            items=existing_items,  # type: ignore[arg-type]
            discount=new_discount,
        )
        quotation.subtotal = subtotal
        quotation.tax = total_tax
        quotation.total = grand_total

    db.commit()
    db.refresh(quotation)

    res = QuotationResponse.model_validate(quotation)
    res.customer_name = quotation.customer.name if quotation.customer else None
    return res


@router.get(
    "/{quotation_id}/pdf",
    summary="Download Quotation PDF",
    response_class=Response,
)
def download_quotation_pdf(
    quotation_id: uuid.UUID,
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Generate and stream an A4 trade quotation PDF document.
    Strictly scoped to current business.
    """
    stmt = select(Quotation).where(
        Quotation.id == quotation_id,
        Quotation.business_id == current_business.id,
    )
    quotation = db.scalars(stmt).first()
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found.",
        )

    pdf_bytes = generate_quotation_pdf(
        quotation=quotation,
        business=current_business,
        customer=quotation.customer,
    )

    filename = f"{quotation.quotation_number}.pdf"
    headers = {
        "Content-Disposition": f'inline; filename="{filename}"',
        "Content-Type": "application/pdf",
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


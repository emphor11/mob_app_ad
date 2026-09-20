import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.dependencies.db import get_db
from app.dependencies.business import get_current_business
from app.models.business import Business
from app.models.customer import Customer
from app.models.quotation import Quotation, QuotationItem, QuotationStatus
from app.schemas.quotation import QuotationCreate, QuotationResponse
from app.services.quotation_calculator import (
    calculate_quotation_totals,
    generate_quotation_number,
)

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
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    List all quotations scoped strictly to the current authenticated business.
    """
    stmt = (
        select(Quotation)
        .where(Quotation.business_id == current_business.id)
    )
    if status_filter:
        stmt = stmt.where(Quotation.status == status_filter)

    stmt = stmt.order_by(Quotation.created_at.desc())
    quotations = list(db.scalars(stmt).all())

    # Attach customer_name to response
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
    # Verify customer belongs to the current business
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

    # Generate sequential quotation number if not provided
    quote_number = (
        payload.quotation_number.strip()
        if payload.quotation_number and payload.quotation_number.strip()
        else generate_quotation_number(db, current_business.id)
    )

    # Authoritative calculation
    subtotal, total_tax, grand_total, computed_items = calculate_quotation_totals(
        items=payload.items,
        discount=payload.discount,
    )

    # Create quotation record
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

    # Create quotation items
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

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_

from app.dependencies.db import get_db
from app.dependencies.business import get_current_business
from app.models.business import Business
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse

router = APIRouter()


@router.get(
    "/",
    summary="Customers service status",
)
def customers_status():
    """Return status and active customers endpoints."""
    return {
        "status": "ready",
        "service": "customers",
        "endpoints": ["/", "/{id}"],
    }


@router.get("", response_model=List[CustomerResponse])

def list_customers(
    search: Optional[str] = Query(None, description="Filter by name, phone, or email"),
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    List all customers scoped strictly to the current authenticated business.
    Optional ?search= filter looks through customer name, phone, and email.
    """
    stmt = select(Customer).where(Customer.business_id == current_business.id)

    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Customer.name.ilike(term),
                Customer.phone.ilike(term),
                Customer.email.ilike(term),
            )
        )

    stmt = stmt.order_by(Customer.created_at.desc())
    return list(db.scalars(stmt).all())


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Create a new customer automatically scoped to the authenticated business.
    Client cannot supply or override business_id.
    """
    customer = Customer(
        business_id=current_business.id,
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        email=payload.email.strip() if payload.email else None,
        address=payload.address.strip() if payload.address else None,
        gstin=payload.gstin.strip() if payload.gstin else None,
        notes=payload.notes.strip() if payload.notes else None,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: uuid.UUID,
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Retrieve a specific customer by ID, strictly enforcing business tenant isolation.
    Returns 404 if customer does not exist or belongs to another business.
    """
    stmt = select(Customer).where(
        Customer.id == customer_id,
        Customer.business_id == current_business.id,
    )
    customer = db.scalars(stmt).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    return customer


@router.patch("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: uuid.UUID,
    payload: CustomerUpdate,
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Update customer details, strictly enforcing business tenant isolation.
    Returns 404 if customer does not exist or belongs to another business.
    """
    stmt = select(Customer).where(
        Customer.id == customer_id,
        Customer.business_id == current_business.id,
    )
    customer = db.scalars(stmt).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: uuid.UUID,
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Delete a customer, strictly enforcing business tenant isolation.
    Returns 404 if customer does not exist or belongs to another business.
    """
    stmt = select(Customer).where(
        Customer.id == customer_id,
        Customer.business_id == current_business.id,
    )
    customer = db.scalars(stmt).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    db.delete(customer)
    db.commit()
    return None

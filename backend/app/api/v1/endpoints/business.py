from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.business import Business
from app.schemas.business import BusinessCreate, BusinessUpdate, BusinessResponse

router = APIRouter()


@router.get("/me", response_model=BusinessResponse)
def get_my_business(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve the current active business profile for the authenticated user.
    Returns 404 if the user hasn't created a business profile yet.
    """
    stmt = (
        select(Business)
        .where(Business.user_id == current_user.id)
        .order_by(Business.is_default.desc(), Business.created_at.asc())
    )
    business = db.scalars(stmt).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business profile not found. Please set up your business profile.",
        )
    return business


@router.post("", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
def create_business(
    payload: BusinessCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new business profile for the authenticated user.
    Initially supports 1 business per user. If one exists, returns 400.
    """
    stmt = select(Business).where(Business.user_id == current_user.id)
    existing_business = db.scalars(stmt).first()
    if existing_business:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business profile already exists for this user.",
        )

    business = Business(
        user_id=current_user.id,
        name=payload.name,
        owner_name=payload.owner_name,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        gstin=payload.gstin,
        logo_url=payload.logo_url,
        currency=payload.currency,
        invoice_prefix=payload.invoice_prefix or "INV",
        quotation_prefix=payload.quotation_prefix or "QT",
        default_terms=payload.default_terms,
        payment_instructions=payload.payment_instructions,
        is_default=True,
    )
    db.add(business)
    db.commit()
    db.refresh(business)
    return business


@router.put("/me", response_model=BusinessResponse)
def update_my_business(
    payload: BusinessUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update the active business profile for the authenticated user.
    """
    stmt = (
        select(Business)
        .where(Business.user_id == current_user.id)
        .order_by(Business.is_default.desc(), Business.created_at.asc())
    )
    business = db.scalars(stmt).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business profile not found. Please set up your business profile first.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(business, field, value)

    db.commit()
    db.refresh(business)
    return business


@router.get("", response_model=List[BusinessResponse])
def list_my_businesses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all businesses associated with the authenticated user (supports future multi-business).
    """
    stmt = (
        select(Business)
        .where(Business.user_id == current_user.id)
        .order_by(Business.is_default.desc(), Business.created_at.asc())
    )
    return list(db.scalars(stmt).all())

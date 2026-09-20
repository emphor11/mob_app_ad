from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.business import Business


def get_current_business(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Business:
    """
    Dependency that retrieves the active business profile for the authenticated user.
    Enforces Rule 2 (Strict Tenant Isolation): all business operations must be scoped
    to this business. If user has not configured a business profile, returns 400 Bad Request.
    """
    stmt = (
        select(Business)
        .where(Business.user_id == current_user.id)
        .order_by(Business.is_default.desc(), Business.created_at.asc())
    )
    business = db.scalars(stmt).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business profile required. Please set up your business profile first.",
        )
    return business

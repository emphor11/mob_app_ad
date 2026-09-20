from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.dependencies.business import get_current_business
from app.models.business import Business
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get(
    "",
    response_model=DashboardResponse,
    summary="Get aggregated business dashboard metrics and activity feeds",
)
def get_dashboard(
    current_business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Returns aggregated KPI metrics:
    - Total Sales
    - Total Collected
    - Outstanding
    - Overdue
    - Counts of Customers, Quotations, and Invoices
    And 4 recent activity feeds:
    - Recent Quotations (top 5)
    - Recent Invoices (top 5)
    - Recent Payments (top 5)
    - Overdue Invoices
    Strictly scoped to the current authenticated business.
    """
    return DashboardService.get_dashboard_summary(db=db, business=current_business)

from fastapi import APIRouter
from app.api.v1.endpoints import auth, business, customers, quotations, invoices, payments, dashboard

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(business.router, prefix="/business", tags=["Business"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
api_router.include_router(quotations.router, prefix="/quotations", tags=["Quotations"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])


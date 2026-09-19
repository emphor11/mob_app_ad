from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def get_customers_status():
    return {
        "status": "ready",
        "service": "customers",
        "message": "Customers router initialized. Business-scoped customer CRUD will be implemented in Phase 9/10.",
    }

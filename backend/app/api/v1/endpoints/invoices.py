from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def get_invoices_status():
    return {
        "status": "ready",
        "service": "invoices",
        "message": "Invoices router initialized. Immutable quotation-to-invoice conversion will be implemented in Phase 15/16.",
    }

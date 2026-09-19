from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def get_quotations_status():
    return {
        "status": "ready",
        "service": "quotations",
        "message": "Quotations router initialized. Multi-item pricing and status workflow will be implemented in Phase 11/12.",
    }

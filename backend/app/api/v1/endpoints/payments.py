from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def get_payments_status():
    return {
        "status": "ready",
        "service": "payments",
        "message": "Payments router initialized. Overpayment validation and tracking will be implemented in Phase 17/18.",
    }

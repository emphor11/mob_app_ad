from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def get_auth_status():
    return {
        "status": "ready",
        "service": "authentication",
        "message": "Auth router initialized. Registration, login, and JWT token issuance will be implemented in Phase 7.",
    }

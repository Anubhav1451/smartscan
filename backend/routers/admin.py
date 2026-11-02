from fastapi import APIRouter, HTTPException, status
from models.schemas import ResetDemoRequest, ResetDemoResponse
import seed

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/reset-demo", response_model=ResetDemoResponse)
def reset_demo(req: ResetDemoRequest):
    """
    Idempotent demo reset endpoint.
    Restores clean demo catalog, accounts, canonical bill SS-20481, and past transactions.
    """
    if not req.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation required to reset demo data"
        )
    
    try:
        res = seed.seed_database()
        return ResetDemoResponse(
            status="success",
            message=res.get("message", "Demo data reset completed successfully"),
            canonical_bill=res.get("canonical_bill"),
            stores=res.get("stores")
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reset failed: {str(e)}"
        )

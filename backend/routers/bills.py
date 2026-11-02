from fastapi import APIRouter

router = APIRouter(prefix="/bills", tags=["Bills"])

@router.get("/{bill_no}")
def get_bill(bill_no: str):
    """Retrieve bill details by bill number for customer view."""
    return {"message": "Bill retrieval handler ready for Phase 2"}

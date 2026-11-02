from fastapi import APIRouter
from models.schemas import ExitVerifyRequest

router = APIRouter(prefix="/staff", tags=["Exit Staff"])

@router.get("/bills/{bill_no}")
def get_staff_bill_detail(bill_no: str):
    """Retrieve bill checklist for staff exit verification."""
    return {"message": "Staff bill checklist handler ready for Phase 2"}

@router.post("/verify")
def verify_exit(req: ExitVerifyRequest):
    """
    Compare bag items against billed items:
    - Match: VERIFIED (bill becomes VERIFIED_USED)
    - Extra items: MISMATCH alert
    - Already used: ALREADY_USED rejection
    """
    return {"message": "Exit verification handler ready for Phase 2"}

@router.get("/cash-pending")
def list_pending_cash_orders():
    """List orders in CASH_PENDING status for the staff's store."""
    return []

@router.post("/cash/{order_id}/confirm")
def confirm_cash_payment(order_id: str):
    """Staff confirms cash payment: decrement stock, assign bill_no, set BILL_ACTIVE."""
    return {"message": "Cash confirmation handler ready for Phase 3"}

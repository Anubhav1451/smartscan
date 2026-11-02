from fastapi import APIRouter, HTTPException, status, Depends
from core.db import get_supabase
from core.auth import get_current_user, UserProfile

router = APIRouter(prefix="/bills", tags=["Bills"])

@router.get("/{bill_no}")
def get_bill(bill_no: str, user: UserProfile = Depends(get_current_user)):
    """
    Retrieve bill details by bill number for customer/owner view.
    Matches docs/05_API.md specification.
    """
    sb = get_supabase()
    res = sb.table("orders").select(
        "id, bill_no, store_id, customer_id, status, payment_method, total, qr_token, created_at, paid_at, stores(id, name, code, area)"
    ).eq("bill_no", bill_no.strip().upper()).execute()
    
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Bill not found", "code": "NOT_FOUND"}
        )
    order = res.data[0]
    
    # Ownership guard: if customer, must be their bill
    if user.role == "customer" and order["customer_id"] != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Access forbidden: you do not own this bill", "code": "FORBIDDEN"}
        )
    
    items_res = sb.table("order_items").select(
        "id, product_id, name_snapshot, price_snapshot, qty"
    ).eq("order_id", order["id"]).execute()
    
    return {
        **order,
        "items": items_res.data or []
    }

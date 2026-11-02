import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from core.db import get_supabase
from core.auth import require_staff_or_manager, UserProfile
from models.schemas import (
    ExitVerifyRequest,
    ExitUseRequest,
    ExitVerifyResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Exit Staff & Verifications"])

def parse_bill_identifier(identifier: str) -> Dict[str, Optional[str]]:
    """
    Parses bill identifier which could be:
    - Full QR payload: SMARTSCAN|BILL|SS-20481|{uuid}|FM|317
    - Bill number: SS-20481
    - Order UUID: e.g. 473a3ceb-...
    """
    cleaned = identifier.strip()
    if cleaned.startswith("SMARTSCAN|BILL|"):
        parts = cleaned.split("|")
        # SMARTSCAN | BILL | bill_no | order_id | store_code | total
        return {
            "bill_no": parts[2] if len(parts) > 2 else None,
            "order_id": parts[3] if len(parts) > 3 else None
        }
    if cleaned.upper().startswith("SS-"):
        return {"bill_no": cleaned.upper(), "order_id": None}
    return {"bill_no": None, "order_id": cleaned}

@router.get("/staff/cash-pending")
def list_pending_cash_orders(staff: UserProfile = Depends(require_staff_or_manager)):
    """
    List orders in CASH_PENDING status for the staff member's store.
    """
    sb = get_supabase()
    res = sb.table("orders").select(
        "id, bill_no, total, payment_method, status, created_at, customer_id, profiles(display_name), order_items(id, name_snapshot, price_snapshot, qty)"
    ).eq("store_id", staff.store_id).eq("status", "CASH_PENDING").order("created_at", desc=True).execute()
    
    orders = []
    for row in (res.data or []):
        cust_profile = row.get("profiles") or {}
        items = row.get("order_items") or []
        orders.append({
            "id": row["id"],
            "bill_no": row.get("bill_no"),
            "total": row["total"],
            "status": row["status"],
            "created_at": row["created_at"],
            "customer_name": cust_profile.get("display_name", "Customer"),
            "items_count": sum(it.get("qty", 1) for it in items),
            "items": items
        })
    return orders

def find_order_for_verification(bill_id_or_no: str):
    sb = get_supabase()
    parsed = parse_bill_identifier(bill_id_or_no)
    
    query = sb.table("orders").select(
        "id, bill_no, store_id, customer_id, status, payment_method, total, qr_token, created_at, paid_at, stores(id, name, code), profiles(display_name)"
    )
    
    order = None
    if parsed.get("order_id"):
        res = query.eq("id", parsed["order_id"]).execute()
        if res.data:
            order = res.data[0]
            
    if not order and parsed.get("bill_no"):
        res = sb.table("orders").select(
            "id, bill_no, store_id, customer_id, status, payment_method, total, qr_token, created_at, paid_at, stores(id, name, code), profiles(display_name)"
        ).eq("bill_no", parsed["bill_no"]).execute()
        if res.data:
            order = res.data[0]
            
    return order

@router.post("/exit/verify", response_model=ExitVerifyResponse)
def verify_exit_bill(req: ExitVerifyRequest, staff: UserProfile = Depends(require_staff_or_manager)):
    """
    Verifies a customer's bill at the exit gate:
    - Returns VERIFIED with bill details and items checklist
    - Returns ALREADY_USED if bill was previously verified and used
    - Returns WRONG_STORE if bill is from a different store
    - Returns INVALID if bill does not exist or was never paid
    """
    target = req.bill_id or req.bill_no
    if not target:
        return ExitVerifyResponse(status="INVALID", message="No bill identifier provided")
    
    order = find_order_for_verification(target)
    if not order:
        return ExitVerifyResponse(status="INVALID", message="Invalid QR or bill not found")
    
    # Store check
    if order["store_id"] != staff.store_id:
        return ExitVerifyResponse(
            status="WRONG_STORE",
            message="This bill belongs to another store",
            bill_no=order.get("bill_no"),
            order_id=order["id"],
            store_name=(order.get("stores") or {}).get("name", "Other Store")
        )
    
    sb = get_supabase()
    # Fetch billed items
    items_res = sb.table("order_items").select(
        "id, product_id, name_snapshot, price_snapshot, qty"
    ).eq("order_id", order["id"]).execute()
    items = items_res.data or []
    
    store_info = order.get("stores") or {}
    customer_info = order.get("profiles") or {}
    
    if order["status"] == "VERIFIED_USED":
        # Look up timestamp from exit_verifications
        v_res = sb.table("exit_verifications").select(
            "created_at"
        ).eq("order_id", order["id"]).order("created_at", desc=True).limit(1).execute()
        used_at = v_res.data[0]["created_at"] if v_res.data else order.get("paid_at")
        
        return ExitVerifyResponse(
            status="ALREADY_USED",
            message="This bill has already been verified and used",
            bill_no=order.get("bill_no"),
            order_id=order["id"],
            store_name=store_info.get("name"),
            store_code=store_info.get("code"),
            total=order["total"],
            items=items,
            used_at=used_at,
            customer_name=customer_info.get("display_name")
        )
    
    if order["status"] == "BILL_ACTIVE":
        return ExitVerifyResponse(
            status="VERIFIED",
            message="Bill verified successfully. Authorized for exit.",
            bill_no=order.get("bill_no"),
            order_id=order["id"],
            store_name=store_info.get("name"),
            store_code=store_info.get("code"),
            total=order["total"],
            items=items,
            created_at=order.get("created_at"),
            customer_name=customer_info.get("display_name")
        )
    
    return ExitVerifyResponse(
        status="INVALID",
        message=f"Bill status is {order['status']} (payment not completed)"
    )

@router.post("/exit/use")
def mark_bill_used(req: ExitUseRequest, staff: UserProfile = Depends(require_staff_or_manager)):
    """
    Marks the bill USED and records the verification event in exit_verifications.
    """
    target = req.bill_id or req.bill_no
    if not target:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "No bill identifier provided", "code": "MISSING_ID"}
        )
    
    order = find_order_for_verification(target)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Bill not found", "code": "NOT_FOUND"}
        )
    
    if order["store_id"] != staff.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Bill belongs to another store", "code": "WRONG_STORE"}
        )
    
    sb = get_supabase()
    now_ts = datetime.now(timezone.utc).isoformat()
    
    # Transition to VERIFIED_USED
    sb.table("orders").update({"status": "VERIFIED_USED"}).eq("id", order["id"]).execute()
    
    # Record in exit_verifications
    sb.table("exit_verifications").insert({
        "order_id": order["id"],
        "staff_id": staff.id,
        "result": "VERIFIED",
        "bag_items": []
    }).execute()
    
    return {
        "status": "VERIFIED_USED",
        "bill_no": order.get("bill_no"),
        "order_id": order["id"],
        "verified_at": now_ts,
        "message": "Bill marked as USED successfully"
    }

@router.get("/staff/bills/{bill_no}")
def get_staff_bill_detail(bill_no: str, staff: UserProfile = Depends(require_staff_or_manager)):
    """Retrieve bill checklist for staff exit verification by bill_no."""
    sb = get_supabase()
    res = sb.table("orders").select(
        "id, bill_no, store_id, total, status, qr_token, created_at, paid_at, stores(name, code), profiles(display_name)"
    ).eq("bill_no", bill_no.strip().upper()).execute()
    
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Bill not found", "code": "NOT_FOUND"}
        )
    order = res.data[0]
    
    if order["store_id"] != staff.store_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Bill not found in this store", "code": "NOT_FOUND"}
        )
        
    items_res = sb.table("order_items").select(
        "id, product_id, name_snapshot, price_snapshot, qty"
    ).eq("order_id", order["id"]).execute()
    
    return {
        **order,
        "items": items_res.data or []
    }

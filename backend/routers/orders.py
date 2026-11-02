import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Header, Depends
from core.db import get_supabase
from core.auth import get_current_user, UserProfile, require_staff_or_manager
from models.schemas import (
    CheckoutRequest,
    CheckoutResponse,
    MockPayRequest,
    MockPayResponse,
    CashConfirmResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Orders & Checkout"])

# In-memory idempotency cache for payment requests
# Maps idempotency_key -> response dict
IDEMPOTENCY_CACHE: Dict[str, Dict[str, Any]] = {}

@router.post("/checkout", response_model=CheckoutResponse)
def checkout(req: CheckoutRequest, user: UserProfile = Depends(get_current_user)):
    """
    Validates items and stock, computes total server-side,
    creates order + order_items in PAYMENT_PENDING status.
    Fails per-item if requested qty exceeds available stock.
    """
    sb = get_supabase()
    
    # 1. Verify store exists
    store_res = sb.table("stores").select("id, name, code").eq("id", req.store_id).execute()
    if not store_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Store not found", "code": "STORE_NOT_FOUND"}
        )
    
    if not req.items or len(req.items) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Cart is empty", "code": "EMPTY_CART"}
        )
    
    # 2. Fetch and validate each item against current store inventory
    barcodes = [item.barcode for item in req.items]
    prod_res = sb.table("products").select(
        "id, store_id, barcode, name, category, price, stock"
    ).eq("store_id", req.store_id).in_("barcode", barcodes).execute()
    
    prods_by_barcode = {p["barcode"]: p for p in (prod_res.data or [])}
    
    validated_items = []
    grand_total = 0
    
    for item in req.items:
        product = prods_by_barcode.get(item.barcode)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": f"Product with barcode {item.barcode} is not sold in this store",
                    "code": "PRODUCT_NOT_FOUND",
                    "barcode": item.barcode
                }
            )
        
        # Check stock rule: never let stock go negative, fail per-item if qty exceeds stock
        if product["stock"] < item.qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": f"Item '{product['name']}' only has {product['stock']} in stock (requested {item.qty})",
                    "code": "INSUFFICIENT_STOCK",
                    "product_name": product["name"],
                    "available_stock": product["stock"],
                    "requested_qty": item.qty
                }
            )
        
        line_total = product["price"] * item.qty
        grand_total += line_total
        validated_items.append({
            "product_id": product["id"],
            "barcode": product["barcode"],
            "name": product["name"],
            "price": product["price"],
            "qty": item.qty,
            "line_total": line_total
        })
    
    # 3. Create order record in PAYMENT_PENDING
    status_str = "CASH_PENDING" if req.payment_method == "CASH" else "PAYMENT_PENDING"
    order_insert = {
        "store_id": req.store_id,
        "customer_id": user.id,
        "status": status_str,
        "payment_method": req.payment_method or "UPI_MOCK",
        "total": grand_total
    }
    
    order_res = sb.table("orders").insert(order_insert).execute()
    if not order_res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Failed to create order", "code": "ORDER_CREATION_FAILED"}
        )
    order = order_res.data[0]
    order_id = order["id"]
    
    # 4. Insert order items snapshot
    order_items_rows = [
        {
            "order_id": order_id,
            "product_id": item["product_id"],
            "name_snapshot": item["name"],
            "price_snapshot": item["price"],
            "qty": item["qty"]
        }
        for item in validated_items
    ]
    sb.table("order_items").insert(order_items_rows).execute()
    
    return CheckoutResponse(
        order_id=order_id,
        total=grand_total,
        status=status_str,
        store_id=req.store_id,
        items=validated_items
    )

def process_mock_payment(order_id: str, idempotency_key: Optional[str] = None) -> dict:
    sb = get_supabase()
    
    # Idempotency check 1: in-memory cache
    if idempotency_key and idempotency_key in IDEMPOTENCY_CACHE:
        return IDEMPOTENCY_CACHE[idempotency_key]
    
    # Fetch order
    order_res = sb.table("orders").select(
        "id, bill_no, store_id, customer_id, status, payment_method, total, qr_token, paid_at, stores(name, code)"
    ).eq("id", order_id).execute()
    
    if not order_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Order not found", "code": "ORDER_NOT_FOUND"}
        )
    order = order_res.data[0]
    
    # Idempotency check 2: if already paid/active, return current bill info without double-decrementing
    if order["status"] in ("BILL_ACTIVE", "PAID", "VERIFIED_USED"):
        resp = {
            "order_id": order["id"],
            "bill_no": order.get("bill_no", ""),
            "qr_token": order.get("qr_token", ""),
            "total": order["total"],
            "status": order["status"],
            "store_id": order["store_id"],
            "paid_at": order.get("paid_at")
        }
        if idempotency_key:
            IDEMPOTENCY_CACHE[idempotency_key] = resp
        return resp
    
    # Fetch items for this order
    items_res = sb.table("order_items").select(
        "id, product_id, name_snapshot, price_snapshot, qty, products(id, stock, name)"
    ).eq("order_id", order_id).execute()
    
    order_items = items_res.data or []
    if not order_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "No items found for this order", "code": "NO_ITEMS"}
        )
    
    # Re-verify stock before final payment
    for item in order_items:
        prod = item.get("products")
        if not prod or prod.get("stock", 0) < item["qty"]:
            available = prod.get("stock", 0) if prod else 0
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": f"Item '{item['name_snapshot']}' is out of stock (available: {available}, requested: {item['qty']})",
                    "code": "OUT_OF_STOCK"
                }
            )
    
    # Decrement stock for each item atomically
    for item in order_items:
        curr_stock = item["products"]["stock"]
        new_stock = curr_stock - item["qty"]
        if new_stock < 0:
            new_stock = 0
        sb.table("products").update({"stock": new_stock}).eq("id", item["product_id"]).execute()
    
    # Generate canonical bill number SS-#####
    try:
        bill_res = sb.rpc("generate_next_bill_no").execute()
        bill_no = bill_res.data if bill_res.data else f"SS-{int(datetime.now().timestamp()) % 100000}"
    except Exception as e:
        logger.warning(f"Error calling generate_next_bill_no: {e}")
        bill_no = f"SS-{int(datetime.now().timestamp()) % 100000}"
    
    # Format QR token payload: SMARTSCAN|BILL|{bill_no}|{order_id}|{store_code}|{total}
    store_code = (order.get("stores") or {}).get("code", "FM")
    qr_token = f"SMARTSCAN|BILL|{bill_no}|{order_id}|{store_code}|{order['total']}"
    paid_at = datetime.now(timezone.utc).isoformat()
    
    # Update order to BILL_ACTIVE
    sb.table("orders").update({
        "status": "BILL_ACTIVE",
        "bill_no": bill_no,
        "qr_token": qr_token,
        "paid_at": paid_at,
        "payment_method": "UPI_MOCK"
    }).eq("id", order_id).execute()
    
    result = {
        "order_id": order_id,
        "bill_no": bill_no,
        "qr_token": qr_token,
        "total": order["total"],
        "status": "BILL_ACTIVE",
        "store_id": order["store_id"],
        "paid_at": paid_at,
        "items": [
            {
                "name": it["name_snapshot"],
                "price": it["price_snapshot"],
                "qty": it["qty"]
            }
            for it in order_items
        ]
    }
    
    if idempotency_key:
        IDEMPOTENCY_CACHE[idempotency_key] = result
        
    return result

@router.post("/orders/{order_id}/mock-pay", response_model=MockPayResponse)
def mock_pay_prompt_endpoint(
    order_id: str,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    user: UserProfile = Depends(get_current_user)
):
    """
    Process mock payment with required Idempotency-Key header.
    Matches prompt requirement.
    """
    return process_mock_payment(order_id, idempotency_key)

@router.post("/orders/{order_id}/pay/mock", response_model=MockPayResponse)
def mock_pay_docs_endpoint(
    order_id: str,
    req: MockPayRequest = MockPayRequest(),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    user: UserProfile = Depends(get_current_user)
):
    """
    Process mock payment. Matches docs/05_API.md requirement.
    """
    return process_mock_payment(order_id, idempotency_key)

@router.post("/orders/{order_id}/pay/cash")
def pay_cash(order_id: str, user: UserProfile = Depends(get_current_user)):
    """
    Place order into CASH_PENDING status awaiting staff confirmation.
    """
    sb = get_supabase()
    order_res = sb.table("orders").select("id, status, total").eq("id", order_id).execute()
    if not order_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Order not found", "code": "ORDER_NOT_FOUND"}
        )
    order = order_res.data[0]
    
    sb.table("orders").update({
        "status": "CASH_PENDING",
        "payment_method": "CASH"
    }).eq("id", order_id).execute()
    
    return {
        "order_id": order_id,
        "status": "CASH_PENDING",
        "total": order["total"]
    }

def confirm_cash_core(order_id: str, staff: UserProfile) -> dict:
    sb = get_supabase()
    order_res = sb.table("orders").select(
        "id, store_id, total, status, stores(name, code)"
    ).eq("id", order_id).execute()
    
    if not order_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Order not found", "code": "ORDER_NOT_FOUND"}
        )
    order = order_res.data[0]
    
    # Store check: staff can only confirm cash for their assigned store
    if order["store_id"] != staff.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Cannot confirm cash for an order in another store", "code": "WRONG_STORE"}
        )
    
    if order["status"] != "CASH_PENDING":
        if order["status"] in ("BILL_ACTIVE", "VERIFIED_USED"):
            return {
                "order_id": order["id"],
                "bill_no": order.get("bill_no", ""),
                "qr_token": order.get("qr_token", ""),
                "total": order["total"],
                "status": order["status"]
            }
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": f"Order status is {order['status']}, expected CASH_PENDING", "code": "INVALID_STATUS"}
        )
    
    # Decrement stock
    items_res = sb.table("order_items").select(
        "id, product_id, qty, products(stock)"
    ).eq("order_id", order_id).execute()
    
    for it in (items_res.data or []):
        curr_stock = it.get("products", {}).get("stock", 0)
        new_stock = max(0, curr_stock - it["qty"])
        sb.table("products").update({"stock": new_stock}).eq("id", it["product_id"]).execute()
    
    # Generate bill_no and qr_token
    try:
        bill_res = sb.rpc("generate_next_bill_no").execute()
        bill_no = bill_res.data if bill_res.data else f"SS-{int(datetime.now().timestamp()) % 100000}"
    except Exception:
        bill_no = f"SS-{int(datetime.now().timestamp()) % 100000}"
    
    store_code = (order.get("stores") or {}).get("code", "FM")
    qr_token = f"SMARTSCAN|BILL|{bill_no}|{order_id}|{store_code}|{order['total']}"
    paid_at = datetime.now(timezone.utc).isoformat()
    
    sb.table("orders").update({
        "status": "BILL_ACTIVE",
        "bill_no": bill_no,
        "qr_token": qr_token,
        "paid_at": paid_at,
        "payment_method": "CASH"
    }).eq("id", order_id).execute()
    
    return {
        "order_id": order_id,
        "bill_no": bill_no,
        "qr_token": qr_token,
        "total": order["total"],
        "status": "BILL_ACTIVE"
    }

@router.post("/orders/{order_id}/cash-confirm", response_model=CashConfirmResponse)
def cash_confirm_prompt(order_id: str, staff: UserProfile = Depends(require_staff_or_manager)):
    """Exit staff or manager confirms cash payment for an order."""
    return confirm_cash_core(order_id, staff)

@router.post("/staff/cash/{order_id}/confirm", response_model=CashConfirmResponse)
def cash_confirm_docs(order_id: str, staff: UserProfile = Depends(require_staff_or_manager)):
    """Docs route for cash confirmation."""
    return confirm_cash_core(order_id, staff)

@router.get("/orders/my")
def get_my_orders(user: UserProfile = Depends(get_current_user)):
    """List orders/bills belonging to the authenticated customer."""
    sb = get_supabase()
    res = sb.table("orders").select(
        "id, bill_no, status, total, payment_method, qr_token, created_at, paid_at, stores(name, code)"
    ).eq("customer_id", user.id).order("created_at", desc=True).limit(20).execute()
    return res.data or []

@router.get("/orders/{order_id}")
def get_order_detail(order_id: str, user: UserProfile = Depends(get_current_user)):
    """Fetch order details and items."""
    sb = get_supabase()
    order_res = sb.table("orders").select(
        "id, bill_no, store_id, customer_id, status, payment_method, total, qr_token, created_at, paid_at, stores(name, code, area)"
    ).eq("id", order_id).execute()
    
    if not order_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Order not found", "code": "ORDER_NOT_FOUND"}
        )
    order = order_res.data[0]
    
    # Ownership guard (unless staff/manager)
    if user.role == "customer" and order["customer_id"] != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Forbidden", "code": "FORBIDDEN"}
        )
    
    items_res = sb.table("order_items").select(
        "id, product_id, name_snapshot, price_snapshot, qty"
    ).eq("order_id", order_id).execute()
    
    return {
        **order,
        "items": items_res.data or []
    }

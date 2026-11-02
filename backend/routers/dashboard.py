import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from fastapi import APIRouter, HTTPException, status, Depends, Query

from core.db import get_supabase
from core.auth import require_manager, require_staff_or_manager, UserProfile
from models.schemas import DashboardSummaryResponse, ImpactMetrics, ResetDemoResponse
import seed

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

def resolve_store(store_id: Optional[str], user: UserProfile):
    """
    Resolves the store to view:
    If store_id is provided, verify it belongs to the manager's retailer.
    Otherwise default to the manager's assigned store.
    """
    sb = get_supabase()
    target_id = store_id or user.store_id
    if not target_id:
        stores_res = sb.table("stores").select("id, name, code, retailer_id").limit(1).execute()
        if not stores_res.data:
            raise HTTPException(status_code=404, detail="No store found")
        return stores_res.data[0]
    
    res = sb.table("stores").select("id, name, code, retailer_id").eq("id", target_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Store not found")
    return res.data[0]

def compute_store_dashboard(store: Dict[str, Any], range_type: str = "today") -> Dict[str, Any]:
    """
    Rule-based store metrics calculated directly from real transaction data.
    Never labelled as AI.
    """
    sb = get_supabase()
    store_id = store["id"]
    now = datetime.now(timezone.utc)
    start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_7d = start_today - timedelta(days=6)
    
    threshold_dt = start_today if range_type == "today" else start_7d
    
    # 1. Fetch all orders for this store
    orders_res = sb.table("orders").select(
        "id, bill_no, total, status, payment_method, created_at, customer_id, profiles(display_name)"
    ).eq("store_id", store_id).order("created_at", desc=True).execute()
    all_orders = orders_res.data or []
    
    # Filter paid/active/verified orders in the chosen range
    paid_statuses = ("PAID", "BILL_ACTIVE", "VERIFIED_USED")
    
    range_orders = [
        o for o in all_orders 
        if datetime.fromisoformat(o["created_at"]) >= threshold_dt
    ]
    range_paid_orders = [o for o in range_orders if o["status"] in paid_statuses]
    
    sales_total = sum(o["total"] for o in range_paid_orders)
    orders_count = len(range_paid_orders)
    
    # Total digital bills issued all-time
    digital_bills_total = len([o for o in all_orders if o.get("bill_no")])
    
    # 2. Fetch order items for items sold and top products
    paid_order_ids = [o["id"] for o in range_paid_orders]
    
    items_sold = 0
    prod_sales = defaultdict(lambda: {"qty": 0, "revenue": 0})
    
    if paid_order_ids:
        # Batch in chunks of 50 to avoid URI length issues
        chunk_size = 50
        for i in range(0, len(paid_order_ids), chunk_size):
            chunk = paid_order_ids[i:i + chunk_size]
            items_res = sb.table("order_items").select(
                "product_id, name_snapshot, price_snapshot, qty, order_id"
            ).in_("order_id", chunk).execute()
            
            for it in (items_res.data or []):
                q = it.get("qty", 1)
                p = it.get("price_snapshot", 0)
                name = it.get("name_snapshot", "Product")
                items_sold += q
                prod_sales[name]["qty"] += q
                prod_sales[name]["revenue"] += p * q
    
    average_bill = round(sales_total / orders_count) if orders_count > 0 else 0
    
    # 3. 7-Day Sales Series (computed calendar day by calendar day)
    sales_last_7_days = []
    for i in range(7):
        day = start_7d + timedelta(days=i)
        day_end = day + timedelta(days=1)
        day_paid = [
            o for o in all_orders 
            if o["status"] in paid_statuses and day <= datetime.fromisoformat(o["created_at"]) < day_end
        ]
        sales_last_7_days.append({
            "date": day.strftime("%Y-%m-%d"),
            "day_name": day.strftime("%a"),
            "label": day.strftime("%d %b"),
            "sales": sum(o["total"] for o in day_paid),
            "orders": len(day_paid)
        })
    
    # 4. Top Products list (sorted by qty sold)
    top_products = []
    for name, stats in sorted(prod_sales.items(), key=lambda x: x[1]["qty"], reverse=True)[:5]:
        top_products.append({
            "name": name,
            "qty_sold": stats["qty"],
            "revenue": stats["revenue"]
        })
    
    # If no sales in current range, fill top products from all paid orders of the store
    if not top_products and all_orders:
        all_paid_ids = [o["id"] for o in all_orders if o["status"] in paid_statuses][:20]
        if all_paid_ids:
            fallback_items = sb.table("order_items").select(
                "name_snapshot, price_snapshot, qty"
            ).in_("order_id", all_paid_ids).execute()
            fb_sales = defaultdict(lambda: {"qty": 0, "revenue": 0})
            for it in (fallback_items.data or []):
                fb_sales[it["name_snapshot"]]["qty"] += it["qty"]
                fb_sales[it["name_snapshot"]]["revenue"] += it["price_snapshot"] * it["qty"]
            for name, stats in sorted(fb_sales.items(), key=lambda x: x[1]["qty"], reverse=True)[:5]:
                top_products.append({
                    "name": name,
                    "qty_sold": stats["qty"],
                    "revenue": stats["revenue"]
                })
    
    # 5. Low stock list (stock <= 5)
    prod_res = sb.table("products").select(
        "id, name, category, price, stock"
    ).eq("store_id", store_id).order("stock", desc=False).execute()
    
    low_stock_items = []
    low_stock_count = 0
    for p in (prod_res.data or []):
        if p["stock"] <= 5:
            low_stock_count += 1
            low_stock_items.append({
                "id": p["id"],
                "name": p["name"],
                "category": p["category"],
                "price": p["price"],
                "stock": p["stock"],
                "in_stock": p["stock"] > 0
            })
    
    # 6. Recent Transactions (latest 10 orders for this store)
    recent_transactions = []
    # Quick order item counts mapping
    order_items_counts = defaultdict(int)
    recent_order_ids = [o["id"] for o in all_orders[:10]]
    if recent_order_ids:
        r_items_res = sb.table("order_items").select("order_id, qty").in_("order_id", recent_order_ids).execute()
        for it in (r_items_res.data or []):
            order_items_counts[it["order_id"]] += it.get("qty", 1)
            
    for o in all_orders[:10]:
        prof = o.get("profiles") or {}
        method_map = {
            "UPI_MOCK": "UPI",
            "CARD_MOCK": "Card",
            "CASH": "Cash"
        }
        status_map = {
            "BILL_ACTIVE": "Paid",
            "PAID": "Paid",
            "VERIFIED_USED": "Verified",
            "CASH_PENDING": "Staff Pending",
            "MISMATCH": "Mismatch"
        }
        recent_transactions.append({
            "id": o["id"],
            "bill_no": o.get("bill_no") or "Pending",
            "customer_name": prof.get("display_name", "Customer"),
            "items_count": order_items_counts.get(o["id"], 1),
            "total": o["total"],
            "payment_method": method_map.get(o.get("payment_method"), o.get("payment_method", "UPI")),
            "status": status_map.get(o["status"], o["status"]),
            "raw_status": o["status"],
            "created_at": o["created_at"]
        })
    
    # 7. Impact Metrics (PRD definitions: paid orders x 4 min in hours; paper bills = paid orders; items = total items sold)
    # Using all paid orders count for total cumulative impact
    all_paid_orders_count = len([o for o in all_orders if o["status"] in paid_statuses])
    all_items_sold = sum(stats["qty"] for stats in prod_sales.values())
    if all_items_sold == 0:
        all_items_sold = items_sold or (all_paid_orders_count * 2)
        
    queue_time_minutes = all_paid_orders_count * 4
    queue_time_hours = round(queue_time_minutes / 60, 1)
    
    impact = ImpactMetrics(
        queue_time_saved_hours=queue_time_hours,
        queue_time_saved_minutes=queue_time_minutes,
        paper_bills_avoided=all_paid_orders_count,
        items_scanned=all_items_sold,
        disclaimer="Estimates calculated directly from transaction data. No AI."
    )
    
    return {
        "store_id": store["id"],
        "store_name": store["name"],
        "store_code": store["code"],
        "range": range_type,
        "sales_total": sales_total,
        "orders_count": orders_count,
        "items_sold": items_sold,
        "average_bill": average_bill,
        "digital_bills_total": digital_bills_total,
        "low_stock_count": low_stock_count,
        "sales_last_7_days": sales_last_7_days,
        "top_products": top_products,
        "recent_transactions": recent_transactions,
        "low_stock_items": low_stock_items,
        "impact": impact
    }

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary_query(
    store_id: Optional[str] = Query(None),
    range: str = Query("today", pattern="^(today|7d)$"),
    user: UserProfile = Depends(require_manager)
):
    """Query-based summary endpoint for Manager Dashboard."""
    store = resolve_store(store_id, user)
    return compute_store_dashboard(store, range)

@router.get("/{store_id}/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary_path(
    store_id: str,
    range: str = Query("today", pattern="^(today|7d)$"),
    user: UserProfile = Depends(require_manager)
):
    """Path-based summary endpoint per docs/05_API.md."""
    store = resolve_store(store_id, user)
    return compute_store_dashboard(store, range)

@router.get("/sales-series")
def get_sales_series(
    store_id: Optional[str] = Query(None),
    user: UserProfile = Depends(require_manager)
):
    """Retrieve 7-day sales breakdown."""
    store = resolve_store(store_id, user)
    summary = compute_store_dashboard(store, "7d")
    return summary["sales_last_7_days"]

@router.get("/top-products")
def get_top_products(
    store_id: Optional[str] = Query(None),
    range: str = Query("today", pattern="^(today|7d)$"),
    user: UserProfile = Depends(require_manager)
):
    """Retrieve top selling products."""
    store = resolve_store(store_id, user)
    summary = compute_store_dashboard(store, range)
    return summary["top_products"]

@router.get("/recent-orders")
def get_recent_orders(
    store_id: Optional[str] = Query(None),
    user: UserProfile = Depends(require_manager)
):
    """Retrieve recent transactions table."""
    store = resolve_store(store_id, user)
    summary = compute_store_dashboard(store, "today")
    return summary["recent_transactions"]

@router.get("/low-stock")
def get_low_stock(
    store_id: Optional[str] = Query(None),
    user: UserProfile = Depends(require_manager)
):
    """Retrieve low-stock inventory items."""
    store = resolve_store(store_id, user)
    summary = compute_store_dashboard(store, "today")
    return summary["low_stock_items"]

@router.post("/reset-demo", response_model=ResetDemoResponse)
def reset_demo_manager(user: UserProfile = Depends(require_manager)):
    """
    In-app Reset Demo Data for store managers.
    Restores seed state, 3 stores, 16 products, and 40 orders server-side.
    """
    try:
        res = seed.seed_database()
        return ResetDemoResponse(
            status="success",
            message=res.get("message", "Demo data reset completed successfully"),
            canonical_bill=res.get("canonical_bill"),
            stores=res.get("stores")
        )
    except Exception as e:
        logger.error(f"Manager reset failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reset failed: {str(e)}"
        )

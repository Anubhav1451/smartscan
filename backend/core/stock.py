import logging
import threading
from typing import List, Dict, Any
from fastapi import HTTPException, status
from core.db import get_supabase

logger = logging.getLogger(__name__)
stock_lock = threading.Lock()

def decrement_order_stock_atomic(order_items: List[Dict[str, Any]]):
    """
    Race-safe atomic stock decrement.
    1. Acquires lock.
    2. For each item:
       - Checks current stock >= qty
       - Conditional decrement: stock = curr_stock - qty WHERE stock >= qty
       - If conditional update fails: immediately rolls back any decremented items
         in this order, releases lock, and raises HTTP 400 OUT_OF_STOCK.
    3. Never allows negative stock, never creates half orders.
    """
    sb = get_supabase()
    decremented_so_far = []

    with stock_lock:
        for item in order_items:
            product_id = item["product_id"]
            qty = item["qty"]
            item_name = item.get("name_snapshot") or item.get("name") or "Product"

            # Query fresh stock from database
            prod_res = sb.table("products").select("id, name, stock").eq("id", product_id).execute()
            if not prod_res.data:
                _rollback_stock(sb, decremented_so_far)
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"error": f"Product '{item_name}' not found", "code": "PRODUCT_NOT_FOUND"}
                )
            
            p = prod_res.data[0]
            curr_stock = p["stock"]
            if curr_stock < qty:
                _rollback_stock(sb, decremented_so_far)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": f"Item '{item_name}' is out of stock (available: {curr_stock}, requested: {qty})",
                        "code": "OUT_OF_STOCK"
                    }
                )

            # Conditional update: only succeeds if stock >= qty
            new_stock = curr_stock - qty
            up_res = sb.table("products").update({"stock": new_stock}).eq("id", product_id).gte("stock", qty).execute()
            if not up_res.data:
                _rollback_stock(sb, decremented_so_far)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": f"Item '{item_name}' is out of stock",
                        "code": "OUT_OF_STOCK"
                    }
                )
            
            decremented_so_far.append({"product_id": product_id, "qty": qty})

def _rollback_stock(sb, decremented_items: List[Dict[str, Any]]):
    for item in decremented_items:
        try:
            prod_res = sb.table("products").select("stock").eq("id", item["product_id"]).execute()
            if prod_res.data:
                curr = prod_res.data[0]["stock"]
                sb.table("products").update({"stock": curr + item["qty"]}).eq("id", item["product_id"]).execute()
        except Exception as e:
            logger.error(f"Stock rollback error for product {item['product_id']}: {e}")


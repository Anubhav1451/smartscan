from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Query
from core.db import get_supabase
from models.schemas import StoreResponse, ProductResponse

router = APIRouter(prefix="/stores", tags=["Stores"])

@router.get("", response_model=List[StoreResponse])
def get_stores():
    """
    List all available stores.
    The customer selects the store inside the app (NO store-QR entry step).
    """
    sb = get_supabase()
    res = sb.table("stores").select("id, retailer_id, name, area, code").order("name").execute()
    return res.data or []

@router.get("/{store_id}/products", response_model=List[ProductResponse])
def get_store_products(
    store_id: str,
    search: Optional[str] = Query(None, description="Optional search by product name, category, or barcode")
):
    """
    List products in a selected store with per-store pricing and inventory.
    """
    sb = get_supabase()
    query = sb.table("products").select("id, store_id, barcode, name, category, price, stock").eq("store_id", store_id)
    
    if search and search.strip():
        term = f"%{search.strip()}%"
        # Search by name or category
        query = query.or_(f"name.ilike.{term},category.ilike.{term},barcode.ilike.{term}")
    
    res = query.order("name").execute()
    products = []
    for item in (res.data or []):
        products.append({
            **item,
            "in_stock": item["stock"] > 0
        })
    return products

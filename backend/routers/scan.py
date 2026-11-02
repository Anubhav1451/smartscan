from typing import Optional
from fastapi import APIRouter, HTTPException, status, Query
from core.db import get_supabase
from models.schemas import ScanRequest, ProductResponse

router = APIRouter(tags=["Scan & Products"])

def lookup_product_by_barcode(store_id: str, barcode: str) -> dict:
    sb = get_supabase()
    res = sb.table("products").select(
        "id, store_id, barcode, name, category, price, stock"
    ).eq("store_id", store_id).eq("barcode", barcode).execute()
    
    if not res.data or len(res.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Product not found in this store", "code": "PRODUCT_NOT_FOUND"}
        )
    
    product = res.data[0]
    return {
        **product,
        "in_stock": product["stock"] > 0
    }

@router.post("/scan", response_model=ProductResponse)
def scan_product(req: ScanRequest):
    """
    Look up scanned barcode within specific store context.
    Matches docs/05_API.md specification.
    """
    return lookup_product_by_barcode(req.store_id, req.barcode)

@router.get("/products/by-barcode", response_model=ProductResponse)
def get_product_by_barcode(
    store_id: str = Query(..., description="Store UUID"),
    barcode: str = Query(..., description="Barcode string")
):
    """
    Look up product by store and barcode.
    404 if not sold in that specific store.
    """
    return lookup_product_by_barcode(store_id, barcode)

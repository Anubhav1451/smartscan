from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Query, Depends, Body
from core.db import get_supabase
from core.auth import require_manager, UserProfile
from models.schemas import (
    StoreResponse, 
    ProductResponse, 
    ProductCreateRequest, 
    ProductUpdateRequest,
    BarcodeLookupResponse
)

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
        # Search by name, category, or barcode
        query = query.or_(f"name.ilike.{term},category.ilike.{term},barcode.ilike.{term}")
    
    res = query.order("name").execute()
    products = []
    for item in (res.data or []):
        products.append({
            **item,
            "in_stock": item["stock"] > 0
        })
    return products

@router.get("/{store_id}/products/barcode-lookup", response_model=BarcodeLookupResponse)
def lookup_barcode_for_store(
    store_id: str,
    barcode: str = Query(..., min_length=1, description="Barcode to look up"),
    user: UserProfile = Depends(require_manager)
):
    """
    Manager scan-to-add barcode resolution:
    1. If exists in THIS store -> status EXISTS_CURRENT_STORE with product details.
    2. If exists in ANOTHER store -> status EXISTS_OTHER_STORE with name, category, and other store name.
    3. If new -> status NEW_PRODUCT.
    Strictly enforced: caller must be a manager of this store.
    """
    if str(user.store_id) != str(store_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Access forbidden: you are not a manager of this store", "code": "FORBIDDEN"}
        )
    
    cleaned_barcode = barcode.strip()
    sb = get_supabase()

    # Check current store first
    curr_res = sb.table("products").select(
        "id, store_id, barcode, name, category, price, stock"
    ).eq("store_id", store_id).eq("barcode", cleaned_barcode).execute()

    if curr_res.data and len(curr_res.data) > 0:
        prod = curr_res.data[0]
        return BarcodeLookupResponse(
            status="EXISTS_CURRENT_STORE",
            barcode=cleaned_barcode,
            product={**prod, "in_stock": prod["stock"] > 0}
        )
    
    # Check if exists in another store
    other_res = sb.table("products").select(
        "name, category, barcode, stores(name)"
    ).eq("barcode", cleaned_barcode).limit(1).execute()

    if other_res.data and len(other_res.data) > 0:
        other_item = other_res.data[0]
        store_info = other_item.get("stores") or {}
        store_name = store_info.get("name") if isinstance(store_info, dict) else "Another Store"
        return BarcodeLookupResponse(
            status="EXISTS_OTHER_STORE",
            barcode=cleaned_barcode,
            other_product={
                "name": other_item["name"],
                "category": other_item["category"],
                "store_name": store_name
            }
        )

    return BarcodeLookupResponse(
        status="NEW_PRODUCT",
        barcode=cleaned_barcode
    )

@router.post("/{store_id}/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def add_store_product(
    store_id: str,
    req: ProductCreateRequest,
    user: UserProfile = Depends(require_manager)
):
    """
    Add a single product to the store's catalogue (Part 1 / Feature A).
    Strictly enforced: caller must be manager of this store.
    """
    if str(user.store_id) != str(store_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Access forbidden: you are not a manager of this store", "code": "FORBIDDEN"}
        )
    
    barcode = req.barcode.strip()
    name = req.name.strip()
    category = req.category.strip()
    price = req.price
    stock = req.stock

    if not barcode or not name or not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Barcode, name, and category are required non-empty fields", "code": "VALIDATION_ERROR"}
        )
    
    if price < 0 or stock < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Price and stock cannot be negative", "code": "VALIDATION_ERROR"}
        )

    sb = get_supabase()

    # Prevent duplicates within store
    existing = sb.table("products").select("id").eq("store_id", store_id).eq("barcode", barcode).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": f"Product with barcode {barcode} already exists in this store", "code": "PRODUCT_EXISTS"}
        )

    insert_payload = {
        "store_id": store_id,
        "barcode": barcode,
        "name": name,
        "category": category,
        "price": price,
        "stock": stock
    }

    res = sb.table("products").insert(insert_payload).execute()
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Failed to create product in database", "code": "DATABASE_ERROR"}
        )
    
    row = res.data[0]
    return {
        **row,
        "in_stock": row["stock"] > 0
    }

def _update_product_internal(store_id: str, product_id: str, req: ProductUpdateRequest, user: UserProfile):
    if str(user.store_id) != str(store_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Access forbidden: you are not a manager of this store", "code": "FORBIDDEN"}
        )
    
    sb = get_supabase()

    # Verify product belongs to this store
    prod_res = sb.table("products").select("*").eq("id", product_id).eq("store_id", store_id).execute()
    if not prod_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Product not found in this store", "code": "PRODUCT_NOT_FOUND"}
        )

    updates = {}
    if req.name is not None and req.name.strip():
        updates["name"] = req.name.strip()
    if req.category is not None and req.category.strip():
        updates["category"] = req.category.strip()
    if req.price is not None:
        if req.price < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "Price cannot be negative", "code": "VALIDATION_ERROR"}
            )
        updates["price"] = int(req.price)
    if req.stock is not None:
        if req.stock < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "Stock cannot be negative", "code": "VALIDATION_ERROR"}
            )
        updates["stock"] = int(req.stock)

    if not updates:
        row = prod_res.data[0]
        return {**row, "in_stock": row["stock"] > 0}

    up_res = sb.table("products").update(updates).eq("id", product_id).eq("store_id", store_id).execute()
    if not up_res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Failed to update product in database", "code": "DATABASE_ERROR"}
        )
    
    updated_row = up_res.data[0]
    return {
        **updated_row,
        "in_stock": updated_row["stock"] > 0
    }

@router.patch("/{store_id}/products/{product_id}", response_model=ProductResponse)
def update_store_product_by_path(
    store_id: str,
    product_id: str,
    req: ProductUpdateRequest,
    user: UserProfile = Depends(require_manager)
):
    """
    Update price, stock, name, or category for a specific product.
    Matches 05_API.md PATCH /stores/{store_id}/products.
    """
    return _update_product_internal(store_id, product_id, req, user)

@router.patch("/{store_id}/products", response_model=ProductResponse)
def update_store_product(
    store_id: str,
    req: ProductUpdateRequest,
    user: UserProfile = Depends(require_manager)
):
    """
    Alternative PATCH endpoint where product id is passed in the request body.
    """
    if not req.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Product id is required in request body for PATCH /stores/{store_id}/products", "code": "VALIDATION_ERROR"}
        )
    return _update_product_internal(store_id, req.id, req, user)

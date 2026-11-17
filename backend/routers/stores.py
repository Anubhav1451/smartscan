import csv
import io
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Query, Depends, Body, UploadFile, File
from fastapi.responses import Response
from core.db import get_supabase
from core.auth import require_manager, UserProfile
from core.unknown_scans import get_unknown_scans, delete_unknown_scan
from models.schemas import (
    StoreResponse, 
    ProductResponse, 
    ProductCreateRequest, 
    ProductUpdateRequest,
    BarcodeLookupResponse,
    UnknownScanResponse,
    ImportPreviewResponse,
    ImportExecuteResponse,
    ImportRowError
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

@router.get("/{store_id}/unknown-scans", response_model=List[UnknownScanResponse])
def get_store_unknown_scans(
    store_id: str,
    user: UserProfile = Depends(require_manager)
):
    """
    Part 2: Feature C — List barcodes scanned by shoppers that are not in this store's catalogue.
    Strictly manager only for their own store.
    """
    if str(user.store_id) != str(store_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Access forbidden: you are not a manager of this store", "code": "FORBIDDEN"}
        )
    return get_unknown_scans(store_id)

@router.delete("/{store_id}/unknown-scans/{scan_id}")
def remove_store_unknown_scan(
    store_id: str,
    scan_id: str,
    user: UserProfile = Depends(require_manager)
):
    """
    Dismiss or delete an unknown scan entry.
    """
    if str(user.store_id) != str(store_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Access forbidden: you are not a manager of this store", "code": "FORBIDDEN"}
        )
    success = delete_unknown_scan(store_id, scan_id)
    return {"success": success}

# ==============================================================================
# Bulk Catalogue Import (Part 3 - Feature B)
# ==============================================================================

def _parse_csv_content(content_bytes: bytes):
    try:
        text = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content_bytes.decode("latin-1")
    
    stream = io.StringIO(text)
    reader = csv.DictReader(stream)
    if not reader.fieldnames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Uploaded CSV file is empty or missing headers", "code": "EMPTY_CSV"}
        )

    # Check required headers
    field_map = {f.strip().lower(): f for f in reader.fieldnames if f}
    required_cols = {"barcode", "name", "category", "price", "stock"}
    if not required_cols.issubset(set(field_map.keys())):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": f"Invalid CSV headers. Required exactly: barcode, name, category, price, stock. Found: {reader.fieldnames}",
                "code": "INVALID_CSV_HEADERS"
            }
        )

    rows = []
    row_num = 1 # header is row 1
    for raw_row in reader:
        row_num += 1
        clean_row = {}
        for col in required_cols:
            orig_key = field_map[col]
            val = raw_row.get(orig_key, "")
            clean_row[col] = val.strip() if val else ""
        rows.append((row_num, clean_row))
    return rows

def _validate_import_rows(store_id: str, rows):
    seen_barcodes = {}
    to_add = []
    to_update = []
    failed = []
    valid_candidates = []

    for row_num, r in rows:
        barcode = r.get("barcode", "").strip()
        name = r.get("name", "").strip()
        category = r.get("category", "").strip()
        price_str = r.get("price", "").strip()
        stock_str = r.get("stock", "").strip()

        if not barcode:
            failed.append(ImportRowError(row=row_num, barcode=barcode, name=name, reason="Missing barcode"))
            continue

        if not name:
            failed.append(ImportRowError(row=row_num, barcode=barcode, name=name, reason="Missing product name"))
            continue

        if not category:
            failed.append(ImportRowError(row=row_num, barcode=barcode, name=name, reason="Missing product category"))
            continue

        # Validate price
        try:
            price = int(price_str)
            if price < 0:
                failed.append(ImportRowError(row=row_num, barcode=barcode, name=name, reason="Price cannot be negative"))
                continue
        except (ValueError, TypeError):
            failed.append(ImportRowError(row=row_num, barcode=barcode, name=name, reason=f"Price must be a valid whole number (INR), got '{price_str}'"))
            continue

        # Validate stock
        try:
            stock = int(stock_str)
            if stock < 0:
                failed.append(ImportRowError(row=row_num, barcode=barcode, name=name, reason="Stock cannot be negative"))
                continue
        except (ValueError, TypeError):
            failed.append(ImportRowError(row=row_num, barcode=barcode, name=name, reason=f"Stock must be a valid whole number, got '{stock_str}'"))
            continue

        # Check duplicate barcode within upload file
        if barcode in seen_barcodes:
            first_seen_row = seen_barcodes[barcode]
            failed.append(ImportRowError(row=row_num, barcode=barcode, name=name, reason=f"Duplicate barcode in upload file (first seen at row {first_seen_row})"))
            continue

        seen_barcodes[barcode] = row_num
        valid_candidates.append({
            "row_num": row_num,
            "store_id": store_id,
            "barcode": barcode,
            "name": name,
            "category": category,
            "price": price,
            "stock": stock
        })

    # Check database for existing barcodes in this store
    if valid_candidates:
        sb = get_supabase()
        candidate_barcodes = [c["barcode"] for c in valid_candidates]
        # Query in chunks of 500
        existing_map = {}
        chunk_size = 500
        for i in range(0, len(candidate_barcodes), chunk_size):
            chunk = candidate_barcodes[i:i+chunk_size]
            res = sb.table("products").select("id, barcode, price, stock").eq("store_id", store_id).in_("barcode", chunk).execute()
            for p in (res.data or []):
                existing_map[p["barcode"]] = p

        for c in valid_candidates:
            if c["barcode"] in existing_map:
                p = existing_map[c["barcode"]]
                to_update.append({
                    "row": c["row_num"],
                    "id": p["id"],
                    "barcode": c["barcode"],
                    "name": c["name"],
                    "category": c["category"],
                    "new_price": c["price"],
                    "old_price": p["price"],
                    "new_stock": c["stock"],
                    "old_stock": p["stock"]
                })
            else:
                to_add.append({
                    "row": c["row_num"],
                    "barcode": c["barcode"],
                    "name": c["name"],
                    "category": c["category"],
                    "price": c["price"],
                    "stock": c["stock"]
                })

    return {
        "total_rows": len(rows),
        "valid_count": len(to_add) + len(to_update),
        "to_add_count": len(to_add),
        "to_update_count": len(to_update),
        "to_fail_count": len(failed),
        "to_add": to_add,
        "to_update": to_update,
        "failed": failed,
        "valid_candidates": valid_candidates
    }

@router.get("/{store_id}/products/import-template")
def download_import_template(
    store_id: str,
    user: UserProfile = Depends(require_manager)
):
    """
    Download a sample CSV template for bulk product import.
    Contains exactly: barcode,name,category,price,stock with one example row.
    """
    if str(user.store_id) != str(store_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Access forbidden: you are not a manager of this store", "code": "FORBIDDEN"}
        )
    csv_content = (
        "barcode,name,category,price,stock\n"
        "8901234567890,Sample Product Name,General,199,25\n"
    )
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="smartscan_products_template.csv"'}
    )

@router.post("/{store_id}/products/import-preview", response_model=ImportPreviewResponse)
async def preview_product_import(
    store_id: str,
    file: UploadFile = File(...),
    user: UserProfile = Depends(require_manager)
):
    """
    Dry run preview for bulk CSV import. Nothing is written to the database.
    Returns:
    - rows to add
    - rows that will update an existing product
    - rows that failed validation with row numbers and exact reasons
    """
    if str(user.store_id) != str(store_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Access forbidden: you are not a manager of this store", "code": "FORBIDDEN"}
        )

    content_bytes = await file.read()
    rows = _parse_csv_content(content_bytes)
    validation = _validate_import_rows(store_id, rows)

    return ImportPreviewResponse(
        total_rows=validation["total_rows"],
        valid_count=validation["valid_count"],
        to_add_count=validation["to_add_count"],
        to_update_count=validation["to_update_count"],
        to_fail_count=validation["to_fail_count"],
        to_add=validation["to_add"],
        to_update=validation["to_update"],
        failed=validation["failed"]
    )

@router.post("/{store_id}/products/import", response_model=ImportExecuteResponse)
async def execute_product_import(
    store_id: str,
    file: UploadFile = File(...),
    user: UserProfile = Depends(require_manager)
):
    """
    Execute bulk CSV import.
    Upserts valid rows into the store's catalogue (never creates duplicates).
    A 1,000-row file executes in well under 60 seconds via batch upsert.
    """
    if str(user.store_id) != str(store_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Access forbidden: you are not a manager of this store", "code": "FORBIDDEN"}
        )

    content_bytes = await file.read()
    rows = _parse_csv_content(content_bytes)
    validation = _validate_import_rows(store_id, rows)

    valid_candidates = validation["valid_candidates"]
    if not valid_candidates:
        return ImportExecuteResponse(
            status="no_valid_rows",
            added_count=0,
            updated_count=0,
            failed_count=validation["to_fail_count"],
            errors=validation["failed"]
        )

    # Batch upsert valid candidates (on conflict store_id, barcode)
    sb = get_supabase()
    batch_size = 100
    for i in range(0, len(valid_candidates), batch_size):
        batch = [
            {
                "store_id": c["store_id"],
                "barcode": c["barcode"],
                "name": c["name"],
                "category": c["category"],
                "price": c["price"],
                "stock": c["stock"]
            }
            for c in valid_candidates[i:i+batch_size]
        ]
        res = sb.table("products").upsert(batch, on_conflict="store_id,barcode").execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"error": "Failed to upsert product batch", "code": "UPSERT_FAILED"}
            )

    return ImportExecuteResponse(
        status="success",
        added_count=validation["to_add_count"],
        updated_count=validation["to_update_count"],
        failed_count=validation["to_fail_count"],
        errors=validation["failed"]
    )

# ==============================================================================
# Catalogue Care: Internal Barcode Generator (Part 4)
# ==============================================================================

@router.get("/{store_id}/next-internal-barcode")
def get_next_internal_barcode(
    store_id: str,
    user: UserProfile = Depends(require_manager)
):
    """
    Generate next sequential store-internal barcode (prefix 'SS' + number, e.g. SS10001).
    Manager only for their own store.
    """
    if str(user.store_id) != str(store_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Access forbidden: you are not a manager of this store", "code": "FORBIDDEN"}
        )
    sb = get_supabase()
    res = sb.table("products").select("barcode").eq("store_id", store_id).like("barcode", "SS%").execute()
    existing = res.data or []
    max_num = 10000
    for row in existing:
        b = row.get("barcode", "")
        if b.startswith("SS"):
            digits = b[2:]
            if digits.isdigit():
                max_num = max(max_num, int(digits))
    next_barcode = f"SS{max_num + 1}"
    return {"barcode": next_barcode}

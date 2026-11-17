from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from core.db import get_supabase


def record_unknown_scan(store_id: str, barcode: str) -> None:
    """
    Log an unknown barcode scan for a store into Supabase.
    If it was already scanned before, increment count and update last_scanned_at.
    """
    cleaned_barcode = barcode.strip()
    if not cleaned_barcode:
        return

    sb = get_supabase()
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        # Check if row already exists for (store_id, barcode)
        res = sb.table("unknown_scans").select("id, count").eq("store_id", store_id).eq("barcode", cleaned_barcode).execute()
        if res.data and len(res.data) > 0:
            existing = res.data[0]
            current_count = existing.get("count", 1)
            sb.table("unknown_scans").update({
                "count": current_count + 1,
                "last_scanned_at": now_iso
            }).eq("id", existing["id"]).execute()
        else:
            sb.table("unknown_scans").insert({
                "store_id": store_id,
                "barcode": cleaned_barcode,
                "count": 1,
                "last_scanned_at": now_iso,
                "created_at": now_iso
            }).execute()
    except Exception:
        # Handle concurrent conflict on UNIQUE(store_id, barcode)
        try:
            res = sb.table("unknown_scans").select("id, count").eq("store_id", store_id).eq("barcode", cleaned_barcode).execute()
            if res.data and len(res.data) > 0:
                existing = res.data[0]
                current_count = existing.get("count", 1)
                sb.table("unknown_scans").update({
                    "count": current_count + 1,
                    "last_scanned_at": now_iso
                }).eq("id", existing["id"]).execute()
        except Exception:
            pass


def get_unknown_scans(store_id: str) -> List[Dict[str, Any]]:
    """
    Get unknown scans for a store from Supabase, newest first.
    Exclude and purge any barcodes that have since been added to the store's catalogue.
    """
    sb = get_supabase()
    res = sb.table("unknown_scans").select(
        "id, store_id, barcode, count, last_scanned_at, created_at"
    ).eq("store_id", store_id).order("last_scanned_at", desc=True).execute()

    rows = res.data or []
    if not rows:
        return []

    # Filter out barcodes already added to the store's catalogue
    try:
        barcodes = [r["barcode"] for r in rows]
        prod_res = sb.table("products").select("barcode").eq("store_id", store_id).in_("barcode", barcodes).execute()
        existing_barcodes = set(p["barcode"] for p in (prod_res.data or []))

        # Purge existing from unknown_scans in Supabase so the queue stays lean
        if existing_barcodes:
            for b in existing_barcodes:
                sb.table("unknown_scans").delete().eq("store_id", store_id).eq("barcode", b).execute()
            rows = [r for r in rows if r["barcode"] not in existing_barcodes]

        return rows
    except Exception:
        return rows


def delete_unknown_scan(store_id: str, scan_id: str) -> bool:
    """
    Remove the unknown scan row matching store_id + scan_id.
    Returns True if a row was removed, False otherwise.
    """
    sb = get_supabase()
    res = sb.table("unknown_scans").delete().eq("store_id", store_id).eq("id", scan_id).execute()
    return bool(res.data and len(res.data) > 0)


def clear_unknown_scans(store_id: Optional[str] = None) -> None:
    """
    Clear unknown scans.
    With store_id: delete that store's rows.
    Without store_id: delete all rows (seed reset uses this).
    """
    sb = get_supabase()
    if store_id:
        sb.table("unknown_scans").delete().eq("store_id", store_id).execute()
    else:
        sb.table("unknown_scans").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

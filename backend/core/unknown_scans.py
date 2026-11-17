import os
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from core.db import get_supabase

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
DB_PATH = os.path.join(DB_DIR, "unknown_scans.sqlite3")

def init_db():
    os.makedirs(DB_DIR, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS unknown_scans (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL,
                barcode TEXT NOT NULL,
                count INTEGER NOT NULL DEFAULT 1,
                last_scanned_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(store_id, barcode)
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_unknown_store ON unknown_scans(store_id)")
        conn.commit()

init_db()

def record_unknown_scan(store_id: str, barcode: str):
    """
    Log an unknown barcode scan for a store.
    If it was already scanned before, increment count and update last_scanned_at.
    """
    cleaned_barcode = barcode.strip()
    if not cleaned_barcode:
        return

    now_iso = datetime.now(timezone.utc).isoformat()
    scan_id = str(uuid.uuid4())

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            INSERT INTO unknown_scans (id, store_id, barcode, count, last_scanned_at, created_at)
            VALUES (?, ?, ?, 1, ?, ?)
            ON CONFLICT(store_id, barcode) DO UPDATE SET
                count = count + 1,
                last_scanned_at = excluded.last_scanned_at
        """, (scan_id, store_id, cleaned_barcode, now_iso, now_iso))
        conn.commit()

def get_unknown_scans(store_id: str) -> List[Dict[str, Any]]:
    """
    Get unknown scans for a store, excluding any barcodes that have since been
    added to the store's catalogue.
    """
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.execute("""
            SELECT id, store_id, barcode, count, last_scanned_at, created_at
            FROM unknown_scans
            WHERE store_id = ?
            ORDER BY last_scanned_at DESC
        """, (store_id,))
        rows = [dict(r) for r in cur.fetchall()]

    if not rows:
        return []

    # Filter out barcodes already added to the store's catalogue
    try:
        sb = get_supabase()
        barcodes = [r["barcode"] for r in rows]
        res = sb.table("products").select("barcode").eq("store_id", store_id).in_("barcode", barcodes).execute()
        existing_barcodes = set(p["barcode"] for p in (res.data or []))
        
        # Purge existing from sqlite so the DB stays lean
        if existing_barcodes:
            with sqlite3.connect(DB_PATH) as conn:
                for b in existing_barcodes:
                    conn.execute("DELETE FROM unknown_scans WHERE store_id = ? AND barcode = ?", (store_id, b))
                conn.commit()

        return [r for r in rows if r["barcode"] not in existing_barcodes]
    except Exception as e:
        # Fallback to returning rows if Supabase query encounters error
        return rows

def delete_unknown_scan(store_id: str, scan_id: str) -> bool:
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute("DELETE FROM unknown_scans WHERE store_id = ? AND id = ?", (store_id, scan_id))
        conn.commit()
        return cur.rowcount > 0

def clear_unknown_scans(store_id: Optional[str] = None):
    with sqlite3.connect(DB_PATH) as conn:
        if store_id:
            conn.execute("DELETE FROM unknown_scans WHERE store_id = ?", (store_id,))
        else:
            conn.execute("DELETE FROM unknown_scans")
        conn.commit()


"""
SmartScan — Database Seeding and Reset Script
Specification: docs/04_DATABASE.md, docs/06_AGENTS.md, docs/11_AUTH.md

Restores the exact demo state in one idempotent run:
- Demo accounts (Supabase Auth + profiles)
- 3 stores (FreshMart, StyleHub, DailyNeeds)
- Products with EAN-13 barcodes (multi-store pricing for Water Bottle)
- Canonical bill SS-20481
- Past 7 days of transactions for FreshMart dashboard KPIs
"""

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
import httpx
from dotenv import load_dotenv

# Shared demo password for all seeded accounts (docs/11_AUTH.md)
DEMO_PASSWORD = "SmartScanDemo2026!"

# Load environment
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

def get_headers():
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

def create_or_get_user(client: httpx.Client, email: str, display_name: str) -> str:
    """Creates a user via Supabase Auth Admin API or gets existing user ID."""
    admin_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    
    # 1. Try to create the user
    payload = {
        "email": email,
        "password": DEMO_PASSWORD,
        "email_confirm": True,
        "user_metadata": {"display_name": display_name}
    }
    
    res = client.post(admin_url, json=payload, headers=get_headers())
    if res.status_code in (200, 201):
        return res.json()["id"]
    
    # 2. If user already exists, fetch list to find their ID
    list_res = client.get(f"{admin_url}?per_page=50", headers=get_headers())
    if list_res.status_code == 200:
        users = list_res.json().get("users", [])
        for u in users:
            if u.get("email") == email:
                # Update password to ensure it matches DEMO_PASSWORD
                client.put(f"{admin_url}/{u['id']}", json={"password": DEMO_PASSWORD}, headers=get_headers())
                return u["id"]
    
    raise RuntimeError(f"Failed to create or retrieve user {email}: {res.text}")

def seed_database() -> Dict[str, Any]:
    """Execute full seed / reset process. Idempotent."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env before running seed."
        )

    with httpx.Client(timeout=30.0) as client:
        rest_url = f"{SUPABASE_URL}/rest/v1"
        headers = get_headers()

        print("--- [1/6] Cleaning existing orders and demo catalog ---")
        client.delete(f"{rest_url}/exit_verifications?id=neq.00000000-0000-0000-0000-000000000000", headers=headers)
        client.delete(f"{rest_url}/order_items?id=neq.00000000-0000-0000-0000-000000000000", headers=headers)
        client.delete(f"{rest_url}/orders?id=neq.00000000-0000-0000-0000-000000000000", headers=headers)
        client.delete(f"{rest_url}/products?id=neq.00000000-0000-0000-0000-000000000000", headers=headers)
        client.delete(f"{rest_url}/profiles?id=neq.00000000-0000-0000-0000-000000000000", headers=headers)
        client.delete(f"{rest_url}/stores?id=neq.00000000-0000-0000-0000-000000000000", headers=headers)
        client.delete(f"{rest_url}/retailers?id=neq.00000000-0000-0000-0000-000000000000", headers=headers)

        print("--- [2/6] Seeding Retailer and Stores ---")
        ret_res = client.post(
            f"{rest_url}/retailers", 
            json={"name": "SmartScan Demo Retail"}, 
            headers=headers
        )
        retailer_id = ret_res.json()[0]["id"]

        stores_data = [
            {"retailer_id": retailer_id, "name": "FreshMart", "area": "Rajpur Road, Dehradun", "code": "FM"},
            {"retailer_id": retailer_id, "name": "StyleHub", "area": "Rajpur Road, Dehradun", "code": "SH"},
            {"retailer_id": retailer_id, "name": "DailyNeeds", "area": "Subhash Nagar, Dehradun", "code": "DN"},
        ]
        stores_res = client.post(f"{rest_url}/stores", json=stores_data, headers=headers)
        stores_map = {s["code"]: s["id"] for s in stores_res.json()}
        fm_id = stores_map["FM"]
        sh_id = stores_map["SH"]
        dn_id = stores_map["DN"]

        print("--- [3/6] Provisioning Demo Accounts & Profiles ---")
        # 4 demo accounts (docs/11_AUTH.md)
        demo_cust_id = create_or_get_user(client, "demo@smartscan.app", "Demo Customer")
        anubhav_cust_id = create_or_get_user(client, "anubhav@smartscan.app", "Anubhav Kumar")
        staff_id = create_or_get_user(client, "staff@smartscan.app", "FreshMart Exit Staff")
        manager_id = create_or_get_user(client, "manager@smartscan.app", "FreshMart Store Manager")

        profiles = [
            {"id": demo_cust_id, "role": "customer", "store_id": None, "display_name": "Demo Customer"},
            {"id": anubhav_cust_id, "role": "customer", "store_id": None, "display_name": "Anubhav Kumar"},
            {"id": staff_id, "role": "exit_staff", "store_id": fm_id, "display_name": "FreshMart Exit Staff"},
            {"id": manager_id, "role": "manager", "store_id": fm_id, "display_name": "FreshMart Store Manager"},
        ]
        client.post(f"{rest_url}/profiles", json=profiles, headers=headers)

        print("--- [4/6] Seeding Catalog & Multi-Store Products ---")
        products_payload = [
            # FreshMart catalog (docs/01_PRD.md & docs/04_DATABASE.md)
            {"store_id": fm_id, "name": "Amul Taaza Milk 500ml", "barcode": "8901262010015", "category": "Dairy", "price": 62, "stock": 40},
            {"store_id": fm_id, "name": "Britannia Whole Wheat Bread", "barcode": "8901063142217", "category": "Bakery", "price": 45, "stock": 35},
            {"store_id": fm_id, "name": "Head & Shoulders Shampoo 340ml", "barcode": "4902430752108", "category": "Care", "price": 210, "stock": 18},
            {"store_id": fm_id, "name": "Maggi Masala Noodles 12-pack", "barcode": "8901058852336", "category": "Snacks", "price": 168, "stock": 50},
            {"store_id": fm_id, "name": "Tata Salt 1kg", "barcode": "8904043901005", "category": "Grocery", "price": 28, "stock": 60},
            {"store_id": fm_id, "name": "Steel Water Bottle 1L", "barcode": "8901234567890", "category": "Home", "price": 499, "stock": 12},
            {"store_id": fm_id, "name": "Parle-G Gold Biscuits 800g", "barcode": "8901719114120", "category": "Snacks", "price": 120, "stock": 45},
            {"store_id": fm_id, "name": "Coca-Cola 750ml", "barcode": "8901764012235", "category": "Beverages", "price": 40, "stock": 0}, # Out of stock demo
            
            # StyleHub catalog (Proving multi-store pricing & RFID demo prop)
            {"store_id": sh_id, "name": "Steel Water Bottle 1L", "barcode": "8901234567890", "category": "Accessories", "price": 549, "stock": 7},
            {"store_id": sh_id, "name": "Cotton Crew T-Shirt", "barcode": "8903333001011", "category": "Apparel", "price": 799, "stock": 25},
            {"store_id": sh_id, "name": "Classic Sports Cap", "barcode": "8903333001028", "category": "Accessories", "price": 299, "stock": 15},
            {"store_id": sh_id, "name": "Fleece Winter Hoodie", "barcode": "8903333001035", "category": "Apparel", "price": 1499, "stock": 10},

            # DailyNeeds catalog (List filler)
            {"store_id": dn_id, "name": "Aashirvaad Atta 5kg", "barcode": "8901725181222", "category": "Grocery", "price": 245, "stock": 30},
            {"store_id": dn_id, "name": "Fortune Sunflower Oil 1L", "barcode": "8906007281014", "category": "Grocery", "price": 145, "stock": 25},
            {"store_id": dn_id, "name": "Dettol Original Soap 75g", "barcode": "8901396311029", "category": "Care", "price": 38, "stock": 50},
            {"store_id": dn_id, "name": "Good Day Butter Cookies", "barcode": "8901063012213", "category": "Snacks", "price": 30, "stock": 40},
        ]
        prod_res = client.post(f"{rest_url}/products", json=products_payload, headers=headers)
        products_list = prod_res.json()
        fm_products = {p["name"]: p for p in products_list if p["store_id"] == fm_id}

        print("--- [5/6] Seeding Canonical Bill SS-20481 ---")
        # Canonical completed order: Milk 62 + Bread 45 + Shampoo 210 = 317
        canonical_order = {
            "bill_no": "SS-20481",
            "store_id": fm_id,
            "customer_id": anubhav_cust_id,
            "status": "BILL_ACTIVE",
            "payment_method": "UPI_MOCK",
            "total": 317,
            "qr_token": "token_SS-20481_signed",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "paid_at": datetime.now(timezone.utc).isoformat(),
        }
        order_res = client.post(f"{rest_url}/orders", json=canonical_order, headers=headers)
        c_order_id = order_res.json()[0]["id"]

        c_items = [
            {"order_id": c_order_id, "product_id": fm_products["Amul Taaza Milk 500ml"]["id"], "name_snapshot": "Amul Taaza Milk 500ml", "price_snapshot": 62, "qty": 1},
            {"order_id": c_order_id, "product_id": fm_products["Britannia Whole Wheat Bread"]["id"], "name_snapshot": "Britannia Whole Wheat Bread", "price_snapshot": 45, "qty": 1},
            {"order_id": c_order_id, "product_id": fm_products["Head & Shoulders Shampoo 340ml"]["id"], "name_snapshot": "Head & Shoulders Shampoo 340ml", "price_snapshot": 210, "qty": 1},
        ]
        client.post(f"{rest_url}/order_items", json=c_items, headers=headers)

        print("--- [6/6] Seeding Past Transactions for Dashboard Metrics ---")
        # Specific demo rows from Design G Recent Transactions:
        # 1. #SS-20480: Priya Sharma | ₹1,240 | Card | Paid (VERIFIED_USED)
        # 2. #SS-20479: Rahul Verma | ₹458 | Cash | Staff Pending (CASH_PENDING)
        now = datetime.now(timezone.utc)
        demo_recent = [
            {
                "bill_no": "SS-20480",
                "store_id": fm_id,
                "customer_id": demo_cust_id,
                "status": "VERIFIED_USED",
                "payment_method": "CARD_MOCK",
                "total": 1240,
                "qr_token": "token_SS-20480",
                "created_at": (now - timedelta(hours=2)).isoformat(),
                "paid_at": (now - timedelta(hours=2)).isoformat(),
            },
            {
                "bill_no": "SS-20479",
                "store_id": fm_id,
                "customer_id": demo_cust_id,
                "status": "CASH_PENDING",
                "payment_method": "CASH",
                "total": 458,
                "qr_token": "token_SS-20479",
                "created_at": (now - timedelta(hours=3)).isoformat(),
                "paid_at": None,
            }
        ]
        rec_res = client.post(f"{rest_url}/orders", json=demo_recent, headers=headers)
        
        # Add past 7-day distributed orders to populate dashboard charts & stats
        past_orders = []
        for day in range(1, 8):
            dt = now - timedelta(days=day)
            # Create a few realistic orders per day
            for i in range(5):
                past_orders.append({
                    "bill_no": f"SS-{20400 + (day * 10) + i}",
                    "store_id": fm_id,
                    "customer_id": demo_cust_id,
                    "status": "VERIFIED_USED",
                    "payment_method": "UPI_MOCK" if i % 2 == 0 else "CARD_MOCK",
                    "total": 250 + (i * 180),
                    "qr_token": f"token_past_{day}_{i}",
                    "created_at": (dt + timedelta(hours=i * 2)).isoformat(),
                    "paid_at": (dt + timedelta(hours=i * 2)).isoformat(),
                })
        client.post(f"{rest_url}/orders", json=past_orders, headers=headers)

        print("[SUCCESS] Seed & Reset complete. Database ready for SmartScan demo.")
        return {
            "status": "success",
            "message": "Demo data successfully seeded / reset",
            "canonical_bill": "SS-20481",
            "stores": list(stores_map.keys()),
            "demo_password": DEMO_PASSWORD
        }

if __name__ == "__main__":
    try:
        res = seed_database()
        print(res)
    except Exception as e:
        print(f"[SEED ERROR]: {e}", file=sys.stderr)
        sys.exit(1)

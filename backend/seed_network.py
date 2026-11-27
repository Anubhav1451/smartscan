"""
SmartScan — Dehradun Network (Simulated Scale Layer) Seeding Script
Specification: Part 1 of Dehradun Network master prompt.

Creates:
- 100 fictional stores across 13 Dehradun localities (codes NW01 - NW100)
- 25-40 products per store sampled from a 48-product FMCG pool with multi-store pricing
- 7 days of realistic order history (~9,000 orders) with sequential bill numbers SS-70001+
- Idempotent: re-runs restore identical counts
- --clear mode: removes all network data, restoring baseline 3 stores
"""

import os
import sys
import random
import uuid
import argparse
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Tuple
import httpx
from dotenv import load_dotenv

# Ensure backend directory is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

import seed

# 13 Dehradun Localities (docs/Dehradun Network spec)
DEHRADUN_AREAS = [
    "Rajpur Road, Dehradun",
    "Clement Town, Dehradun",
    "Prem Nagar, Dehradun",
    "Transport Nagar (ISBT), Dehradun",
    "Sahastradhara Road, Dehradun",
    "Ballupur, Dehradun",
    "Race Course, Dehradun",
    "Kanwali Road, Dehradun",
    "Chakrata Road, Dehradun",
    "Nehru Colony, Dehradun",
    "EC Road, Dehradun",
    "Haridwar Bypass, Dehradun",
    "Vasant Vihar, Dehradun",
]

# Product pool of 48 common FMCG items across 7 categories
PRODUCT_POOL = [
    # Seed Products Reused
    {"name": "Amul Taaza Milk 500ml", "category": "Dairy", "base_price": 62, "barcode": "8901262010015"},
    {"name": "Britannia Whole Wheat Bread", "category": "Bakery", "base_price": 45, "barcode": "8901063142217"},
    {"name": "Head & Shoulders Shampoo 340ml", "category": "Care", "base_price": 210, "barcode": "4902430752108"},
    {"name": "Maggi Masala Noodles 12-pack", "category": "Snacks", "base_price": 168, "barcode": "8901058852336"},
    {"name": "Tata Salt 1kg", "category": "Grocery", "base_price": 28, "barcode": "8904043901005"},
    {"name": "Steel Water Bottle 1L", "category": "Home", "base_price": 499, "barcode": "8901234567890"},
    {"name": "Parle-G Gold Biscuits 800g", "category": "Snacks", "base_price": 120, "barcode": "8901719114120"},
    {"name": "Coca-Cola 750ml", "category": "Beverages", "base_price": 40, "barcode": "8901764012235"},
    {"name": "Aashirvaad Atta 5kg", "category": "Grocery", "base_price": 245, "barcode": "8901725181222"},
    {"name": "Fortune Sunflower Oil 1L", "category": "Grocery", "base_price": 145, "barcode": "8906007281014"},
    {"name": "Dettol Original Soap 75g", "category": "Care", "base_price": 38, "barcode": "8901396311029"},
    {"name": "Good Day Butter Cookies", "category": "Snacks", "base_price": 30, "barcode": "8901063012213"},
    # Additional Dairy & Bakery
    {"name": "Amul Butter 100g", "category": "Dairy", "base_price": 58, "barcode": "8901262020014"},
    {"name": "Mother Dairy Curd 400g", "category": "Dairy", "base_price": 35, "barcode": "8901648010012"},
    {"name": "Amul Cheese Slices 200g", "category": "Dairy", "base_price": 140, "barcode": "8901262030013"},
    {"name": "Amul Cow Ghee 500ml", "category": "Dairy", "base_price": 310, "barcode": "8901262040012"},
    {"name": "Brown Bread 400g", "category": "Bakery", "base_price": 50, "barcode": "8901063152216"},
    {"name": "Pav Bun 6pc", "category": "Bakery", "base_price": 30, "barcode": "8901063162215"},
    {"name": "Farm Fresh Brown Eggs 6pc", "category": "Bakery", "base_price": 55, "barcode": "8902000010018"},
    # Grocery & Staples
    {"name": "Aashirvaad Atta 10kg", "category": "Grocery", "base_price": 460, "barcode": "8901725191221"},
    {"name": "Tata Tea Gold 500g", "category": "Grocery", "base_price": 320, "barcode": "8901052010015"},
    {"name": "Nescafe Classic Coffee 90g", "category": "Beverages", "base_price": 260, "barcode": "8901058010019"},
    {"name": "India Gate Basmati Rice 5kg", "category": "Grocery", "base_price": 480, "barcode": "8902123010014"},
    {"name": "Tata Sampann Toor Dal 1kg", "category": "Grocery", "base_price": 160, "barcode": "8902123020013"},
    {"name": "Tata Sampann Moong Dal 1kg", "category": "Grocery", "base_price": 140, "barcode": "8902123030012"},
    {"name": "Madhur Pure Sugar 1kg", "category": "Grocery", "base_price": 48, "barcode": "8902123040011"},
    {"name": "Rajma Chitra 1kg", "category": "Grocery", "base_price": 175, "barcode": "8902123050010"},
    {"name": "Chana Besan 500g", "category": "Grocery", "base_price": 65, "barcode": "8902123060019"},
    # Home & Hygiene
    {"name": "Surf Excel Easy Wash 1kg", "category": "Home", "base_price": 145, "barcode": "8901030010011"},
    {"name": "Vim Dishwash Gel 500ml", "category": "Home", "base_price": 115, "barcode": "8901030020010"},
    {"name": "Harpic Power Plus 500ml", "category": "Home", "base_price": 98, "barcode": "8901396010014"},
    {"name": "Good Knight Gold Flash Refill", "category": "Home", "base_price": 82, "barcode": "8901023010011"},
    {"name": "Lizol Disinfectant Cleaner 500ml", "category": "Home", "base_price": 110, "barcode": "8901396020013"},
    {"name": "Comfort Fabric Conditioner 860ml", "category": "Home", "base_price": 220, "barcode": "8901030060016"},
    # Personal Care
    {"name": "Colgate MaxFresh Toothpaste 150g", "category": "Care", "base_price": 115, "barcode": "8901314010018"},
    {"name": "Lux Rose Soap 100g", "category": "Care", "base_price": 42, "barcode": "8901030030019"},
    {"name": "Dettol Antiseptic Liquid 250ml", "category": "Care", "base_price": 140, "barcode": "8901396321028"},
    {"name": "Dove Daily Shine Shampoo 180ml", "category": "Care", "base_price": 175, "barcode": "8901030040018"},
    {"name": "Nivea Soft Light Moisturizer 100ml", "category": "Care", "base_price": 190, "barcode": "8905951010012"},
    # Beverages & Snacks
    {"name": "Frooti Mango Drink 1L", "category": "Beverages", "base_price": 65, "barcode": "8901722010013"},
    {"name": "Real Mixed Fruit Juice 1L", "category": "Beverages", "base_price": 125, "barcode": "8901207010018"},
    {"name": "Horlicks Classic Malt 500g", "category": "Beverages", "base_price": 275, "barcode": "8901030050017"},
    {"name": "Thums Up 750ml", "category": "Beverages", "base_price": 40, "barcode": "8901764022234"},
    {"name": "Haldiram Bhujia Sev 400g", "category": "Snacks", "base_price": 125, "barcode": "8904004400110"},
    {"name": "Lays Magic Masala Chips 50g", "category": "Snacks", "base_price": 20, "barcode": "8901491101831"},
    {"name": "Kurkure Masala Munch 85g", "category": "Snacks", "base_price": 20, "barcode": "8901491501839"},
    {"name": "Cadbury Dairy Milk Silk 60g", "category": "Snacks", "base_price": 85, "barcode": "8901233010017"},
    {"name": "Fresh Red Onions 1kg", "category": "Grocery", "base_price": 45, "barcode": "8909000010011"},
]


def generate_unique_store_names() -> List[str]:
    """Generates 100 distinct, authentic, fictional Dehradun store names."""
    owners = [
        "Sharma", "Verma", "Gupta", "Rawat", "Negi", "Chauhan", "Joshi", "Bisht",
        "Aggarwal", "Mittal", "Kapoor", "Rana", "Thapa", "Bhatt", "Pant", "Kala",
        "Semwal", "Dobhal", "Uniyal", "Kandpal", "Gairola", "Bahuguna", "Nautiyal",
        "Sundriyal", "Dimri", "Khanduri", "Panwar", "Payal", "Gusain", "Rawal",
        "Pundir", "Bhandari", "Barthwal", "Tiwari", "Pandey", "Dhyani", "Pokhriyal",
        "Kukreti", "Kotnala", "Badoni"
    ]
    formats = [
        "General Store", "Kirana Bhandar", "Daily Mart", "Provision Store",
        "Departmental Store", "Super Store", "Grocery Store"
    ]
    standalones = [
        "Doon Fresh Mart", "Hill View Supermarket", "Valley Fresh", "Doon Valley Mart",
        "Green Basket Dehradun", "Fresh & Fast", "Apna Bazaar", "City Fresh Point",
        "Har Din Fresh", "Pahadi Haat Mart", "Shivalik Fresh", "Doon Daily Essentials",
        "Himalayan Harvest Mart", "Doon Grocers", "Capital Supermarket", "Green Valley Mart",
        "Dehradun Daily Needs", "Nanda Devi Mart", "Garhwal Kirana Hub", "Mussoorie Foothills Mart",
        "Rispana Valley Mart", "Tapkeshwar Daily Mart", "Clock Tower Supermarket", "Doon Express Mart",
        "Seven Oaks Grocery", "Kempty Fresh Mart", "Dun Basket", "Valley View Provisions",
        "Ganga Yamuna Kirana", "Alaknanda Super Store"
    ]

    names = []
    used = set()

    for s in standalones:
        if s not in used:
            names.append(s)
            used.add(s)

    for o in owners:
        for f in formats:
            cand = f"{o} {f}"
            if cand not in used:
                names.append(cand)
                used.add(cand)
            if len(names) >= 100:
                break
        if len(names) >= 100:
            break

    return names[:100]


def clear_network_data() -> Dict[str, int]:
    """
    FK-safe removal of all network data (NW01-NW100):
    order_items -> orders -> unknown_scans -> products -> stores.
    """
    rest_url = f"{seed.SUPABASE_URL}/rest/v1"
    rest_headers = seed.get_rest_headers()

    with httpx.Client(timeout=45.0) as client:
        # 1. Fetch network stores
        stores_res = client.get(
            f"{rest_url}/stores?select=id,code&code=like.NW*",
            headers=rest_headers
        )
        network_stores = stores_res.json() if stores_res.status_code == 200 else []
        if not network_stores:
            print("No network stores found to clear.")
            return {"stores": 0, "products": 0, "orders": 0, "order_items": 0}

        store_ids = [s["id"] for s in network_stores]
        print(f"Found {len(store_ids)} network stores to remove.")

        # 2. Fetch network order count for reporting
        order_count_res = client.get(
            f"{rest_url}/orders?select=id&bill_no=like.SS-7*&limit=1",
            headers={**rest_headers, "Prefer": "count=exact"}
        )
        content_range = order_count_res.headers.get("content-range", "")
        order_count = int(content_range.split("/")[-1]) if "/" in content_range else 0
        print(f"Found approximately {order_count} network orders to remove.")

        # 3. Delete orders by store_id (cascades to order_items & exit_verifications)
        for i in range(0, len(store_ids), 20):
            chunk = store_ids[i:i + 20]
            param = ",".join(chunk)
            client.delete(f"{rest_url}/orders?store_id=in.({param})", headers=rest_headers)

        # 5. Delete unknown_scans for network stores
        for i in range(0, len(store_ids), 20):
            chunk = store_ids[i:i + 20]
            param = ",".join(chunk)
            client.delete(f"{rest_url}/unknown_scans?store_id=in.({param})", headers=rest_headers)

        # 6. Delete products for network stores
        for i in range(0, len(store_ids), 20):
            chunk = store_ids[i:i + 20]
            param = ",".join(chunk)
            client.delete(f"{rest_url}/products?store_id=in.({param})", headers=rest_headers)

        # 7. Delete network stores
        for i in range(0, len(store_ids), 20):
            chunk = store_ids[i:i + 20]
            param = ",".join(chunk)
            client.delete(f"{rest_url}/stores?id=in.({param})", headers=rest_headers)

        # Verify baseline count
        rem_stores = client.get(f"{rest_url}/stores?select=id,code", headers=rest_headers).json()
        print(f"Network data cleared. Remaining stores in DB: {len(rem_stores)}")
        return {
            "stores": len(store_ids),
            "orders": order_count
        }


def seed_network() -> Dict[str, Any]:
    """Execute network seeding process. Idempotent."""
    # Fixed random seed for guaranteed determinism across runs
    random.seed(42)

    if not seed.SUPABASE_URL or not seed.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")

    rest_url = f"{seed.SUPABASE_URL}/rest/v1"
    rest_headers = seed.get_rest_headers()
    upsert_headers = seed.get_rest_headers(upsert=True)

    with httpx.Client(timeout=60.0) as client:
        print("--- [1/4] Fetching Retailer & Customer Accounts ---")
        ret_res = client.get(f"{rest_url}/retailers?limit=1", headers=rest_headers)
        seed.check_response(ret_res, "fetch retailer")
        retailers = ret_res.json()
        if not retailers:
            raise RuntimeError("No retailer found. Please run seed.py first.")
        retailer_id = retailers[0]["id"]

        demo_cust_id = seed.create_or_get_user(client, "demo@smartscan.app", "Demo Customer")
        anubhav_cust_id = seed.create_or_get_user(client, "anubhav@smartscan.app", "Anubhav Kumar")
        customer_ids = [demo_cust_id, anubhav_cust_id]

        print("--- [2/4] Upserting 100 Dehradun Network Stores ---")
        store_names = generate_unique_store_names()
        # 13 areas: 9 get 8 stores, 4 get 7 stores = exactly 100
        area_distribution = []
        for idx, area in enumerate(DEHRADUN_AREAS):
            count = 8 if idx < 9 else 7
            area_distribution.extend([area] * count)

        stores_payload = []
        for idx in range(100):
            store_code = f"NW{idx + 1:02d}"  # NW01 ... NW100
            stores_payload.append({
                "retailer_id": retailer_id,
                "name": store_names[idx],
                "area": area_distribution[idx],
                "code": store_code
            })

        # Upsert stores on_conflict=code
        store_upsert_res = client.post(
            f"{rest_url}/stores?on_conflict=code",
            json=stores_payload,
            headers=upsert_headers
        )
        seed.check_response(store_upsert_res, "upsert network stores")

        # Fetch all network stores to obtain their UUIDs
        all_net_stores_res = client.get(
            f"{rest_url}/stores?code=like.NW*&order=code.asc&limit=150",
            headers=rest_headers
        )
        seed.check_response(all_net_stores_res, "fetch network stores")
        network_stores = all_net_stores_res.json()
        print(f"Network stores ready: {len(network_stores)} stores.")

        print("--- [3/4] Generating & Upserting Catalogues (25-40 products/store) ---")
        products_payload = []
        store_product_counts = []

        for store in network_stores:
            s_id = store["id"]
            k = random.randint(25, 40)
            store_product_counts.append(k)
            sampled_items = random.sample(PRODUCT_POOL, k)

            for item in sampled_items:
                # price = base * random 0.92-1.12 rounded to rupee
                multiplier = random.uniform(0.92, 1.12)
                price = max(5, round(item["base_price"] * multiplier))
                # stock 0-60, ~8% out of stock
                stock = 0 if random.random() < 0.08 else random.randint(1, 60)

                products_payload.append({
                    "store_id": s_id,
                    "barcode": item["barcode"],
                    "name": item["name"],
                    "category": item["category"],
                    "price": price,
                    "stock": stock
                })

        # Batch upsert products in chunks of 500
        total_prods = len(products_payload)
        chunk_size = 500
        for i in range(0, total_prods, chunk_size):
            chunk = products_payload[i:i + chunk_size]
            p_res = client.post(
                f"{rest_url}/products?on_conflict=store_id,barcode",
                json=chunk,
                headers=upsert_headers
            )
            seed.check_response(p_res, f"products upsert chunk {i // chunk_size + 1}")

        print(f"Catalogue upserted: {total_prods} products across {len(network_stores)} stores.")
        print(f"Store catalogue size: min {min(store_product_counts)}, max {max(store_product_counts)}.")

        # Fetch inserted products for network stores to retrieve product IDs
        network_store_ids = [s["id"] for s in network_stores]
        store_products_map: Dict[str, List[Dict[str, Any]]] = {sid: [] for sid in network_store_ids}

        # Query products in chunks of store IDs
        for i in range(0, len(network_store_ids), 20):
            chunk_sids = network_store_ids[i:i + 20]
            param = ",".join(chunk_sids)
            offset = 0
            while True:
                p_fetch = client.get(
                    f"{rest_url}/products?store_id=in.({param})&select=id,store_id,name,price,stock,barcode&limit=1000&offset={offset}",
                    headers=rest_headers
                )
                seed.check_response(p_fetch, "fetch store products")
                fetched = p_fetch.json()
                if not fetched:
                    break
                for p in fetched:
                    store_products_map[p["store_id"]].append(p)
                if len(fetched) < 1000:
                    break
                offset += 1000

        print("--- [4/4] Generating 7-Day Order History (~9,000 orders) ---")
        # Idempotency: clean up existing network orders first (cascades to order_items)
        for i in range(0, len(network_store_ids), 20):
            chunk = network_store_ids[i:i + 20]
            param = ",".join(chunk)
            client.delete(f"{rest_url}/orders?store_id=in.({param})", headers=rest_headers)

        # Generate orders across 7 days
        now = datetime.now(timezone.utc)
        orders_payload = []
        items_payload = []
        bill_counter = 70001

        for store in network_stores:
            s_id = store["id"]
            prods = store_products_map.get(s_id, [])
            if not prods:
                continue

            for day_offset in range(1, 8):  # Last 7 days
                day_order_count = random.randint(6, 22)
                # 08:00 to 21:30 IST is 02:30 to 16:00 UTC (13.5 hours span = 48600 seconds)
                base_dt = (now - timedelta(days=day_offset)).replace(hour=2, minute=30, second=0, microsecond=0)

                for _ in range(day_order_count):
                    order_id = str(uuid.uuid4())
                    bill_no = f"SS-{bill_counter}"
                    bill_counter += 1
                    qr_token = f"token_{bill_no}"

                    # Timestamp
                    offset_secs = random.randint(0, 48600)
                    created_dt = base_dt + timedelta(seconds=offset_secs)
                    created_at_iso = created_dt.isoformat()

                    # Status & Payment mix: ~92% VERIFIED_USED, ~5% BILL_ACTIVE, ~3% CASH_PENDING
                    p_status = random.random()
                    if p_status < 0.03:
                        status = "CASH_PENDING"
                        payment_method = "CASH"
                        paid_at_iso = None
                    elif p_status < 0.08:
                        status = "BILL_ACTIVE"
                        payment_method = "UPI_MOCK" if random.random() < 0.6 else "CARD_MOCK"
                        paid_at_iso = (created_dt + timedelta(minutes=random.randint(1, 5))).isoformat()
                    else:
                        status = "VERIFIED_USED"
                        payment_method = "UPI_MOCK" if random.random() < 0.6 else "CARD_MOCK"
                        paid_at_iso = (created_dt + timedelta(minutes=random.randint(1, 5))).isoformat()

                    cust_id = customer_ids[0] if random.random() < 0.65 else customer_ids[1]

                    # Line items: 1-4 distinct products from this store
                    num_items = random.randint(1, min(4, len(prods)))
                    sampled_prods = random.sample(prods, num_items)

                    order_total = 0
                    for sp in sampled_prods:
                        qty = random.randint(1, 3)
                        p_snap = sp["price"]
                        order_total += p_snap * qty
                        items_payload.append({
                            "order_id": order_id,
                            "product_id": sp["id"],
                            "name_snapshot": sp["name"],
                            "price_snapshot": p_snap,
                            "qty": qty
                        })

                    orders_payload.append({
                        "id": order_id,
                        "bill_no": bill_no,
                        "store_id": s_id,
                        "customer_id": cust_id,
                        "status": status,
                        "payment_method": payment_method,
                        "total": order_total,
                        "qr_token": qr_token,
                        "created_at": created_at_iso,
                        "paid_at": paid_at_iso
                    })

        # Batch insert orders in chunks of 500
        print(f"Inserting {len(orders_payload)} network orders in chunks of 500...")
        for i in range(0, len(orders_payload), 500):
            chunk = orders_payload[i:i + 500]
            o_res = client.post(f"{rest_url}/orders", json=chunk, headers=rest_headers)
            seed.check_response(o_res, f"orders insert chunk {i // 500 + 1}")

        # Batch insert order_items in chunks of 500
        print(f"Inserting {len(items_payload)} order items in chunks of 500...")
        for i in range(0, len(items_payload), 500):
            chunk = items_payload[i:i + 500]
            it_res = client.post(f"{rest_url}/order_items", json=chunk, headers=rest_headers)
            seed.check_response(it_res, f"order_items insert chunk {i // 500 + 1}")

        # Summary counts
        total_stores_res = client.get(f"{rest_url}/stores?select=id", headers=rest_headers).json()
        grand_total_stores = len(total_stores_res)

        summary = {
            "network_stores": len(network_stores),
            "network_products": total_prods,
            "network_orders": len(orders_payload),
            "network_order_items": len(items_payload),
            "grand_total_stores": grand_total_stores,
            "min_products_per_store": min(store_product_counts),
            "max_products_per_store": max(store_product_counts)
        }

        print("\n========================================================")
        print("SMARTSCAN DEHRADUN NETWORK — SEED SUMMARY")
        print("========================================================")
        print(f"  Network Stores:       {summary['network_stores']}")
        print(f"  Network Products:     {summary['network_products']} (Range: {summary['min_products_per_store']} - {summary['max_products_per_store']}/store)")
        print(f"  Network Orders:       {summary['network_orders']} (SS-70001 to SS-{70000 + len(orders_payload)})")
        print(f"  Network Order Items:  {summary['network_order_items']}")
        print(f"  Grand Total Stores:   {summary['grand_total_stores']} (3 Demo Stores + 100 Network Stores)")
        print("========================================================\n")

        return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed or clear Dehradun Network layer")
    parser.add_argument("--clear", action="store_true", help="Remove all network data and restore baseline 3 stores")
    args = parser.parse_args()

    try:
        if args.clear:
            print("Clearing Dehradun Network layer...")
            res = clear_network_data()
            print(f"Clear completed: removed {res['stores']} stores and {res.get('orders', 0)} orders.")
        else:
            print("Seeding Dehradun Network layer...")
            summary = seed_network()
            print("Seeding completed successfully.")
    except Exception as e:
        err_msg = str(e)
        if seed.SUPABASE_SERVICE_ROLE_KEY and seed.SUPABASE_SERVICE_ROLE_KEY in err_msg:
            err_msg = err_msg.replace(seed.SUPABASE_SERVICE_ROLE_KEY, "[REDACTED]")
        print(f"[NETWORK SEED ERROR]: {err_msg}", file=sys.stderr)
        sys.exit(1)

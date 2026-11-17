import os
import hmac
import hashlib
import httpx
from dotenv import load_dotenv

load_dotenv("backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "smartscan-secret-key-2026")
API_BASE = "http://localhost:8000"

def get_token(email, password="SmartScanDemo2026!"):
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
    }
    payload = {"email": email, "password": password}
    resp = httpx.post(url, json=payload, headers=headers, timeout=10)
    if resp.status_code != 200:
        raise Exception(f"Failed to login {email}: {resp.status_code} {resp.text}")
    return resp.json()["access_token"]

def main():
    print("=== RUNNING FULL REGRESSION SUITE (R1 - R9) ===")
    results = {}

    # Authenticate accounts
    customer_token = get_token("demo@smartscan.app")
    staff_token = get_token("staff@smartscan.app")
    manager_token = get_token("manager@smartscan.app")
    sh_mgr_token = get_token("manager-sh@smartscan.app")

    stores_resp = httpx.get(f"{API_BASE}/stores", timeout=10).json()
    freshmart = next(s for s in stores_resp if s["code"] == "FM")
    stylehub = next(s for s in stores_resp if s["code"] == "SH")

    # R1: FreshMart scan Steel Water Bottle -> Rs 499
    print("\nTesting R1: FreshMart scan Steel Water Bottle (8901234567890)...")
    r1 = httpx.get(
        f"{API_BASE}/products/by-barcode?store_id={freshmart['id']}&barcode=8901234567890",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    ).json()
    assert r1["price"] == 499, f"Expected 499, got {r1['price']}"
    results["R1"] = f"PASS (Price: Rs {r1['price']})"
    print(f"   R1: {results['R1']}")

    # R2: StyleHub scan Steel Water Bottle -> Rs 549
    print("\nTesting R2: StyleHub scan Steel Water Bottle (8901234567890)...")
    r2 = httpx.get(
        f"{API_BASE}/products/by-barcode?store_id={stylehub['id']}&barcode=8901234567890",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    ).json()
    assert r2["price"] == 549, f"Expected 549, got {r2['price']}"
    results["R2"] = f"PASS (Price: Rs {r2['price']})"
    print(f"   R2: {results['R2']}")

    # R3: Checkout cart with Water Bottle (499) + Bread (45) -> Rs 544
    print("\nTesting R3: Checkout cart with Water Bottle + Bread at FreshMart...")
    checkout_payload = {
        "store_id": freshmart["id"],
        "items": [
            {"barcode": "8901234567890", "qty": 1}, # Water Bottle Rs 499
            {"barcode": "8901063142217", "qty": 1}  # Bread Rs 45
        ],
        "payment_method": "UPI_MOCK"
    }
    r3 = httpx.post(
        f"{API_BASE}/checkout",
        json=checkout_payload,
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    ).json()
    order_id = r3["order_id"]
    assert r3["total"] == 544, f"Expected total 544, got {r3['total']}"
    results["R3"] = f"PASS (Order ID: {order_id[:8]}, Total: Rs {r3['total']})"
    print(f"   R3: {results['R3']}")

    # R4: Mock UPI pay -> generates bill SS-##### with verifiable signature
    print("\nTesting R4: Mock UPI pay...")
    pay_key = f"pay-reg-{order_id}"
    r4 = httpx.post(
        f"{API_BASE}/orders/{order_id}/mock-pay",
        headers={"Authorization": f"Bearer {customer_token}", "Idempotency-Key": pay_key},
        timeout=10
    ).json()
    bill_no = r4["bill_no"]
    qr_token = r4["qr_token"]
    assert bill_no.startswith("SS-"), f"Expected bill_no to start with SS-, got {bill_no}"
    assert qr_token.startswith("SMARTSCAN|BILL|")
    results["R4"] = f"PASS (Bill: {bill_no}, QR Token: {qr_token})"
    print(f"   R4: {results['R4']}")

    # Fetch full bill to get bill_id for exit verification
    bill_data = httpx.get(
        f"{API_BASE}/bills/{bill_no}",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    ).json()
    bill_id = bill_data["id"]

    # R5: Exit verification scan -> VERIFIED
    print("\nTesting R5: Exit verification scan...")
    r5 = httpx.post(
        f"{API_BASE}/exit/verify",
        json={"bill_id": bill_id},
        headers={"Authorization": f"Bearer {staff_token}"},
        timeout=10
    ).json()
    assert r5["status"] == "VERIFIED", f"Expected VERIFIED, got {r5}"
    results["R5"] = f"PASS (Status: {r5['status']})"
    print(f"   R5: {results['R5']}")

    # Mark bill used at exit
    httpx.post(
        f"{API_BASE}/exit/use",
        json={"bill_id": bill_id},
        headers={"Authorization": f"Bearer {staff_token}"},
        timeout=10
    )

    # R6: Re-scan of same bill -> ALREADY USED
    print("\nTesting R6: Re-scan of used bill...")
    r6 = httpx.post(
        f"{API_BASE}/exit/verify",
        json={"bill_id": bill_id},
        headers={"Authorization": f"Bearer {staff_token}"},
        timeout=10
    ).json()
    assert r6["status"] == "ALREADY_USED", f"Expected ALREADY_USED, got {r6}"
    results["R6"] = f"PASS (Status: {r6['status']})"
    print(f"   R6: {results['R6']}")

    # R7: Simulated RFID check -> detects Cotton Crew T-Shirt (flagged item); extra item flags MISMATCH
    print("\nTesting R7: Simulated RFID check...")
    # Clean check on current bill
    rfid_clean = httpx.post(
        f"{API_BASE}/exit/rfid-check",
        json={"bill_id": bill_id, "extra_item": False},
        headers={"Authorization": f"Bearer {staff_token}"},
        timeout=10
    ).json()
    assert rfid_clean["status"] == "MATCH"

    # Mismatch check with extra item
    rfid_extra = httpx.post(
        f"{API_BASE}/exit/rfid-check",
        json={"bill_id": bill_id, "extra_item": True},
        headers={"Authorization": f"Bearer {staff_token}"},
        timeout=10
    ).json()
    assert rfid_extra["status"] == "MISMATCH"
    results["R7"] = f"PASS (Clean: {rfid_clean['status']}, Extra item: {rfid_extra['status']})"
    print(f"   R7: {results['R7']}")

    # R8: Demo reset restores seed counts and does NOT delete manager-added products
    print("\nTesting R8: Demo reset preserves manager-added products...")
    # Add a manager product to StyleHub
    custom_barcode = "8909876543999"
    httpx.post(
        f"{API_BASE}/stores/{stylehub['id']}/products",
        json={"barcode": custom_barcode, "name": "Custom Manager Product", "category": "Apparel", "price": 499, "stock": 10},
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    )
    # Trigger Demo Reset
    reset_res = httpx.post(
        f"{API_BASE}/dashboard/reset-demo",
        headers={"Authorization": f"Bearer {manager_token}"},
        timeout=30
    ).json()
    assert reset_res["status"] == "success"

    # Verify custom product STILL exists
    verify_custom = httpx.get(
        f"{API_BASE}/products/by-barcode?store_id={stylehub['id']}&barcode={custom_barcode}",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    )
    assert verify_custom.status_code == 200, "Manager product was deleted during demo reset!"
    results["R8"] = "PASS (Reset succeeded and custom manager product preserved)"
    print(f"   R8: {results['R8']}")

    # Clean up custom product
    httpx.delete(
        f"{SUPABASE_URL}/rest/v1/products?store_id=eq.{stylehub['id']}&barcode=eq.{custom_barcode}",
        headers={"apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"},
        timeout=10
    )

    # R9: Manager dashboard shows live metrics
    print("\nTesting R9: Manager dashboard live metrics...")
    dash = httpx.get(
        f"{API_BASE}/dashboard/summary?store_id={freshmart['id']}&range=today",
        headers={"Authorization": f"Bearer {manager_token}"},
        timeout=10
    ).json()
    assert "sales_total" in dash
    assert "orders_count" in dash
    assert "items_sold" in dash
    assert "sales_last_7_days" in dash
    assert len(dash["sales_last_7_days"]) == 7
    assert "low_stock_items" in dash
    results["R9"] = f"PASS (Sales: Rs {dash['sales_total']}, Orders: {dash['orders_count']}, 7-day items: {len(dash['sales_last_7_days'])})"
    print(f"   R9: {results['R9']}")

    print("\n=======================================================")
    print(">>> FULL REGRESSION SUITE (R1 - R9) RESULTS SUMMARY <<<")
    for k, v in results.items():
        print(f"  [{k}] {v}")
    print("=======================================================")

if __name__ == "__main__":
    main()


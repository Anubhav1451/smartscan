import os
import httpx
from dotenv import load_dotenv

load_dotenv("backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
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
    print("=== STARTING PART 4 ACCEPTANCE TESTS (CATALOGUE CARE: INTERNAL BARCODES & STICKERS) ===")
    
    # 1. Login accounts
    print("1. Authenticating accounts...")
    customer_token = get_token("demo@smartscan.app")
    fm_mgr_token = get_token("manager@smartscan.app")
    sh_mgr_token = get_token("manager-sh@smartscan.app")

    # 2. Get stores
    stores_resp = httpx.get(f"{API_BASE}/stores", timeout=10).json()
    freshmart = next(s for s in stores_resp if s["code"] == "FM")
    stylehub = next(s for s in stores_resp if s["code"] == "SH")

    # 3. Clean up test barcode SS10001 from StyleHub if present
    clean_headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }
    httpx.delete(
        f"{SUPABASE_URL}/rest/v1/products?store_id=eq.{stylehub['id']}&barcode=like.SS*",
        headers=clean_headers,
        timeout=10
    )

    # 4. Request next internal barcode
    print("\n2. Requesting next internal barcode for StyleHub...")
    b1_resp = httpx.get(
        f"{API_BASE}/stores/{stylehub['id']}/next-internal-barcode",
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    )
    assert b1_resp.status_code == 200
    b1 = b1_resp.json()["barcode"]
    print(f"   Generated internal barcode: {b1}")
    assert b1.startswith("SS"), f"Expected barcode to start with 'SS', got {b1}"
    assert b1 == "SS10001"

    # 5. Add product with internal barcode
    print("\n3. Adding product with internal barcode to StyleHub...")
    add_resp = httpx.post(
        f"{API_BASE}/stores/{stylehub['id']}/products",
        json={
            "barcode": b1,
            "name": "Artisan Ceramic Mug",
            "category": "Home",
            "price": 349,
            "stock": 15
        },
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    )
    assert add_resp.status_code in (200, 201)
    print("   Product added to catalogue successfully.")

    # 6. Request next internal barcode again -> should increment to SS10002
    print("\n4. Requesting next internal barcode (sequential check)...")
    b2_resp = httpx.get(
        f"{API_BASE}/stores/{stylehub['id']}/next-internal-barcode",
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    )
    assert b2_resp.status_code == 200
    b2 = b2_resp.json()["barcode"]
    print(f"   Next sequential barcode: {b2}")
    assert b2 == "SS10002", f"Expected SS10002, got {b2}"

    # 7. Customer scans internal barcode
    print("\n5. Customer scans internal barcode SS10001...")
    cust_scan = httpx.get(
        f"{API_BASE}/products/by-barcode?store_id={stylehub['id']}&barcode={b1}",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    )
    assert cust_scan.status_code == 200
    assert cust_scan.json()["name"] == "Artisan Ceramic Mug"
    assert cust_scan.json()["price"] == 349
    print("   Customer scan returns product details and in_stock.")

    # 8. RBAC Refusal on next-internal-barcode
    print("\n6. Testing RBAC Refusal on internal barcode endpoint...")
    cust_fail = httpx.get(
        f"{API_BASE}/stores/{stylehub['id']}/next-internal-barcode",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    )
    assert cust_fail.status_code == 403

    fm_fail = httpx.get(
        f"{API_BASE}/stores/{stylehub['id']}/next-internal-barcode",
        headers={"Authorization": f"Bearer {fm_mgr_token}"},
        timeout=10
    )
    assert fm_fail.status_code == 403
    print("   RBAC correctly refused customer and cross-store manager.")

    print("\n>>> ALL PART 4 BACKEND ACCEPTANCE TESTS PASSED! <<<")

if __name__ == "__main__":
    main()


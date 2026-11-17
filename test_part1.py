import os
import sys
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
    print("=== STARTING PART 1 ACCEPTANCE TESTS ===")
    
    # 1. Login accounts
    print("1. Authenticating accounts...")
    customer_token = get_token("demo@smartscan.app")
    fm_mgr_token = get_token("manager@smartscan.app")
    sh_mgr_token = get_token("manager-sh@smartscan.app")
    print("   Tokens obtained successfully.")

    # 2. Get stores
    print("2. Fetching stores...")
    stores_resp = httpx.get(f"{API_BASE}/stores", timeout=10).json()
    freshmart = next(s for s in stores_resp if s["code"] == "FM")
    stylehub = next(s for s in stores_resp if s["code"] == "SH")
    print(f"   FreshMart ID: {freshmart['id']}")
    print(f"   StyleHub ID: {stylehub['id']}")

    # Clean up test barcodes from StyleHub before starting
    clean_headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }
    httpx.delete(
        f"{SUPABASE_URL}/rest/v1/products?store_id=eq.{stylehub['id']}&barcode=in.(80000000378472,8901262010015)",
        headers=clean_headers,
        timeout=10
    )

    # 3. Acceptance Test 1 & Demo Tag: Sweatshirt in StyleHub
    print("\n3. Testing Demo Tag (Sweatshirt 80000000378472 in StyleHub)...")
    add_payload = {
        "barcode": "80000000378472",
        "name": "Sweatshirt (Off-White, M)",
        "category": "Apparel",
        "price": 899,
        "stock": 20
    }
    add_resp = httpx.post(
        f"{API_BASE}/stores/{stylehub['id']}/products",
        json=add_payload,
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    )
    print(f"   Add Product Response: {add_resp.status_code}")
    assert add_resp.status_code in (200, 201), f"Expected 200/201, got {add_resp.status_code} {add_resp.text}"
    prod_data = add_resp.json()
    assert prod_data["barcode"] == "80000000378472"
    assert prod_data["price"] == 899
    print("   Product added to StyleHub catalogue.")

    # Customer scans at StyleHub
    cust_sh_scan = httpx.get(
        f"{API_BASE}/products/by-barcode?store_id={stylehub['id']}&barcode=80000000378472",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    )
    print(f"   Customer scan at StyleHub: {cust_sh_scan.status_code}")
    assert cust_sh_scan.status_code == 200, f"Expected 200, got {cust_sh_scan.status_code}"
    assert cust_sh_scan.json()["name"] == "Sweatshirt (Off-White, M)"
    assert cust_sh_scan.json()["price"] == 899
    assert cust_sh_scan.json()["in_stock"] == True
    print("   Customer in StyleHub sees product details and Add to Cart.")

    # Customer scans same barcode at FreshMart
    cust_fm_scan = httpx.get(
        f"{API_BASE}/products/by-barcode?store_id={freshmart['id']}&barcode=80000000378472",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    )
    print(f"   Customer scan at FreshMart: {cust_fm_scan.status_code}")
    assert cust_fm_scan.status_code == 404, f"Expected 404, got {cust_fm_scan.status_code}"
    print("   FreshMart correctly reports 404 (Product not found in this store).")

    # 4. Acceptance Test 2: Scan-to-add already existing barcode opens edit, zero duplicate rows
    print("\n4. Testing Scan-to-add already existing barcode in StyleHub...")
    lookup_existing = httpx.get(
        f"{API_BASE}/stores/{stylehub['id']}/products/barcode-lookup?barcode=80000000378472",
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    )
    assert lookup_existing.status_code == 200
    lookup_body = lookup_existing.json()
    assert lookup_body["status"] == "EXISTS_CURRENT_STORE"
    product_id = lookup_body["product"]["id"]
    print("   Lookup returned EXISTS_CURRENT_STORE with product details.")

    # Update price & stock via PATCH
    patch_resp = httpx.patch(
        f"{API_BASE}/stores/{stylehub['id']}/products/{product_id}",
        json={"price": 949, "stock": 25},
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["price"] == 949
    assert patch_resp.json()["stock"] == 25
    print("   Updated price to 949 and stock to 25.")

    # Check for duplicate rows in DB
    all_prods = httpx.get(f"{API_BASE}/stores/{stylehub['id']}/products", timeout=10).json()
    matching = [p for p in all_prods if p["barcode"] == "80000000378472"]
    assert len(matching) == 1, f"Expected 1 matching product row, found {len(matching)}"
    print("   Zero duplicate rows in DB verified (count=1).")

    # 5. Acceptance Test 3: Scan-to-add barcode from FreshMart into StyleHub
    print("\n5. Testing cross-store barcode lookup & copy...")
    fm_milk_barcode = "8901262010015"
    lookup_other = httpx.get(
        f"{API_BASE}/stores/{stylehub['id']}/products/barcode-lookup?barcode={fm_milk_barcode}",
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    )
    assert lookup_other.status_code == 200
    other_body = lookup_other.json()
    assert other_body["status"] == "EXISTS_OTHER_STORE", f"Got status: {other_body}"
    assert other_body["other_product"]["name"] == "Amul Taaza Milk 500ml"
    print(f"   Lookup returned EXISTS_OTHER_STORE ({other_body['other_product']['name']}).")

    # Add to StyleHub with StyleHub's own price (65) and stock (15)
    add_copy_resp = httpx.post(
        f"{API_BASE}/stores/{stylehub['id']}/products",
        json={
            "barcode": fm_milk_barcode,
            "name": other_body["other_product"]["name"],
            "category": other_body["other_product"]["category"],
            "price": 65,
            "stock": 15
        },
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    )
    assert add_copy_resp.status_code in (200, 201)
    print("   Added to StyleHub catalogue at StyleHub's own price (65).")

    # Verify per-store price isolation
    sh_scan = httpx.get(
        f"{API_BASE}/products/by-barcode?store_id={stylehub['id']}&barcode={fm_milk_barcode}",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    ).json()
    fm_scan = httpx.get(
        f"{API_BASE}/products/by-barcode?store_id={freshmart['id']}&barcode={fm_milk_barcode}",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    ).json()
    assert sh_scan["price"] == 65
    assert fm_scan["price"] == 62
    print(f"   Per-store pricing verified: StyleHub={sh_scan['price']} vs FreshMart={fm_scan['price']}.")

    # 6. Acceptance Test 4: Search & Inline Edit
    print("\n6. Testing Manager search and inline edit...")
    search_name = httpx.get(f"{API_BASE}/stores/{stylehub['id']}/products?search=Sweatshirt", timeout=10).json()
    assert len(search_name) >= 1
    assert any(p["barcode"] == "80000000378472" for p in search_name)
    
    search_code = httpx.get(f"{API_BASE}/stores/{stylehub['id']}/products?search=80000000378472", timeout=10).json()
    assert len(search_code) == 1
    assert search_code[0]["name"] == "Sweatshirt (Off-White, M)"
    print("   Search by name and search by barcode both filter correctly.")

    # Reset price back to 899 and stock to 20
    reset_patch = httpx.patch(
        f"{API_BASE}/stores/{stylehub['id']}/products/{product_id}",
        json={"price": 899, "stock": 20},
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    )
    assert reset_patch.status_code == 200
    assert reset_patch.json()["price"] == 899
    print("   Inline edit saved immediately and accurately.")

    # 7. Acceptance Test 5: Strict Server-Side RBAC
    print("\n7. Testing Server-Side RBAC Refusal (403)...")
    # Customer tries to add product
    cust_post = httpx.post(
        f"{API_BASE}/stores/{stylehub['id']}/products",
        json={"barcode": "999999999999", "name": "Fake", "category": "Test", "price": 10, "stock": 1},
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    )
    print(f"   Customer POST /products -> {cust_post.status_code}")
    assert cust_post.status_code == 403, f"Expected 403, got {cust_post.status_code}"

    # Customer tries to edit product
    cust_patch = httpx.patch(
        f"{API_BASE}/stores/{stylehub['id']}/products/{product_id}",
        json={"price": 1},
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    )
    print(f"   Customer PATCH /products -> {cust_patch.status_code}")
    assert cust_patch.status_code == 403, f"Expected 403, got {cust_patch.status_code}"

    # FreshMart Manager tries to add product to StyleHub
    fm_mgr_sh_post = httpx.post(
        f"{API_BASE}/stores/{stylehub['id']}/products",
        json={"barcode": "999999999999", "name": "Fake", "category": "Test", "price": 10, "stock": 1},
        headers={"Authorization": f"Bearer {fm_mgr_token}"},
        timeout=10
    )
    print(f"   FreshMart Manager POST StyleHub -> {fm_mgr_sh_post.status_code}")
    assert fm_mgr_sh_post.status_code == 403, f"Expected 403, got {fm_mgr_sh_post.status_code}"

    # StyleHub Manager tries to edit product in FreshMart
    sh_mgr_fm_post = httpx.post(
        f"{API_BASE}/stores/{freshmart['id']}/products",
        json={"barcode": "999999999999", "name": "Fake", "category": "Test", "price": 10, "stock": 1},
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    )
    print(f"   StyleHub Manager POST FreshMart -> {sh_mgr_fm_post.status_code}")
    assert sh_mgr_fm_post.status_code == 403, f"Expected 403, got {sh_mgr_fm_post.status_code}"

    print("\n>>> ALL 5 PART 1 ACCEPTANCE TESTS PASSED! <<<")

if __name__ == "__main__":
    main()

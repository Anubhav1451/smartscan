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
    print("=== STARTING PART 2 ACCEPTANCE TESTS (FEATURE C) ===")
    
    # 1. Login accounts
    print("1. Authenticating accounts...")
    customer_token = get_token("demo@smartscan.app")
    fm_mgr_token = get_token("manager@smartscan.app")
    sh_mgr_token = get_token("manager-sh@smartscan.app")
    print("   Tokens obtained successfully.")

    # 2. Get stores
    stores_resp = httpx.get(f"{API_BASE}/stores", timeout=10).json()
    freshmart = next(s for s in stores_resp if s["code"] == "FM")
    stylehub = next(s for s in stores_resp if s["code"] == "SH")

    test_unknown_barcode = "8909999888877"

    # Clean up test barcode from DB if it exists
    clean_headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }
    httpx.delete(
        f"{SUPABASE_URL}/rest/v1/products?store_id=eq.{stylehub['id']}&barcode=eq.{test_unknown_barcode}",
        headers=clean_headers,
        timeout=10
    )

    # 3. Customer scans unknown barcode in StyleHub
    print(f"\n2. Customer scanning unlisted barcode ({test_unknown_barcode}) in StyleHub...")
    c_scan1 = httpx.get(
        f"{API_BASE}/products/by-barcode?store_id={stylehub['id']}&barcode={test_unknown_barcode}",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    )
    assert c_scan1.status_code == 404
    print("   Customer received 404 Product Not Found.")

    # 4. Manager checks unknown scan queue
    print("\n3. Manager checking unknown scan queue...")
    q1 = httpx.get(
        f"{API_BASE}/stores/{stylehub['id']}/unknown-scans",
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    )
    assert q1.status_code == 200, f"Expected 200, got {q1.status_code} {q1.text}"
    q1_data = q1.json()
    item1 = next((i for i in q1_data if i["barcode"] == test_unknown_barcode), None)
    assert item1 is not None, f"Barcode {test_unknown_barcode} not found in queue: {q1_data}"
    assert item1["count"] == 1
    print(f"   Barcode logged in queue with count=1.")

    # 5. Customer scans same barcode second time
    print("\n4. Customer scanning same unknown barcode again...")
    c_scan2 = httpx.get(
        f"{API_BASE}/products/by-barcode?store_id={stylehub['id']}&barcode={test_unknown_barcode}",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    )
    assert c_scan2.status_code == 404

    q2 = httpx.get(
        f"{API_BASE}/stores/{stylehub['id']}/unknown-scans",
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    ).json()
    item2 = next(i for i in q2 if i["barcode"] == test_unknown_barcode)
    assert item2["count"] == 2
    print(f"   Queue updated: count=2.")

    # 6. Manager adds product to catalogue (resolving the unknown scan)
    print("\n5. Manager adding product to catalogue to resolve queue...")
    add_resp = httpx.post(
        f"{API_BASE}/stores/{stylehub['id']}/products",
        json={
            "barcode": test_unknown_barcode,
            "name": "Cotton Socks Pair",
            "category": "Accessories",
            "price": 149,
            "stock": 50
        },
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    )
    assert add_resp.status_code in (200, 201)
    print("   Product successfully added to StyleHub catalogue.")

    # Check that barcode is now resolved and no longer in the unknown queue
    q3 = httpx.get(
        f"{API_BASE}/stores/{stylehub['id']}/unknown-scans",
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    ).json()
    assert not any(i["barcode"] == test_unknown_barcode for i in q3)
    print("   Barcode resolved: no longer appears in unknown scans queue.")

    # Customer re-scan now succeeds
    c_scan3 = httpx.get(
        f"{API_BASE}/products/by-barcode?store_id={stylehub['id']}&barcode={test_unknown_barcode}",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    )
    assert c_scan3.status_code == 200
    assert c_scan3.json()["name"] == "Cotton Socks Pair"
    assert c_scan3.json()["price"] == 149
    print("   Customer scan now returns product details + Add to Cart.")

    # 7. RBAC Refusal on unknown scans queue
    print("\n6. Testing RBAC Refusal on unknown scans queue...")
    cust_q = httpx.get(
        f"{API_BASE}/stores/{stylehub['id']}/unknown-scans",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    )
    print(f"   Customer GET unknown-scans -> {cust_q.status_code}")
    assert cust_q.status_code == 403

    fm_mgr_q = httpx.get(
        f"{API_BASE}/stores/{stylehub['id']}/unknown-scans",
        headers={"Authorization": f"Bearer {fm_mgr_token}"},
        timeout=10
    )
    print(f"   FreshMart Manager GET StyleHub unknown-scans -> {fm_mgr_q.status_code}")
    assert fm_mgr_q.status_code == 403

    print("\n>>> ALL PART 2 ACCEPTANCE TESTS PASSED! <<<")

if __name__ == "__main__":
    main()


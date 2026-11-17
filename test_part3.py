import os
import io
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
    print("=== STARTING PART 3 ACCEPTANCE TESTS (FEATURE B: BULK IMPORT) ===")
    
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
    print(f"   StyleHub ID: {stylehub['id']}")

    # 3. Test Template Download Endpoint
    print("\n2. Testing Template Download Endpoint...")
    tpl_resp = httpx.get(
        f"{API_BASE}/stores/{stylehub['id']}/products/import-template",
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    )
    assert tpl_resp.status_code == 200
    assert "barcode,name,category,price,stock" in tpl_resp.text
    print("   Template downloaded successfully with exact 5 headers.")

    # 4. Prepare existing products in StyleHub for the 5 updates
    print("\n3. Preparing 5 existing products in StyleHub for update test...")
    existing_barcodes = [
        ("8903333001011", "Cotton Crew T-Shirt", "Apparel", 799, 25),
        ("8903333001028", "Classic Sports Cap", "Accessories", 299, 15),
        ("8903333001035", "Fleece Winter Hoodie", "Apparel", 1499, 10),
        ("8901234567890", "Steel Water Bottle 1L", "Accessories", 549, 7),
        ("80000000378472", "Sweatshirt (Off-White, M)", "Apparel", 899, 20)
    ]
    # Ensure they exist in DB
    sb_headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Prefer": "resolution=merge-duplicates,return=representation"
    }
    for b, n, c, p, s in existing_barcodes:
        httpx.post(
            f"{SUPABASE_URL}/rest/v1/products",
            json={"store_id": stylehub["id"], "barcode": b, "name": n, "category": c, "price": p, "stock": s},
            headers=sb_headers,
            timeout=10
        )

    # 5. Clean up the 5 new barcodes from DB so they are truly new
    new_barcodes = ["890700000001", "890700000002", "890700000003", "890700000004", "890700000005"]
    clean_in = ",".join(new_barcodes)
    httpx.delete(
        f"{SUPABASE_URL}/rest/v1/products?store_id=eq.{stylehub['id']}&barcode=in.({clean_in})",
        headers={"apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"},
        timeout=10
    )

    # 6. Construct 20-row test CSV:
    # - 5 new products
    # - 5 updates of existing products
    # - 5 validation errors (missing barcode, missing name, missing category, invalid price, negative stock)
    # - 5 duplicate barcodes within the CSV file
    csv_rows = [
        "barcode,name,category,price,stock",
        # 5 New rows (rows 2 to 6)
        "890700000001,Canvas Tote Bag,Accessories,450,30",
        "890700000002,Denim Jacket,Apparel,2499,15",
        "890700000003,Leather Belt,Accessories,799,25",
        "890700000004,Cotton Ankle Socks,Apparel,199,50",
        "890700000005,Wool Scarf,Apparel,699,20",
        # 5 Update rows (rows 7 to 11)
        "8903333001011,Cotton Crew T-Shirt,Apparel,849,35",
        "8903333001028,Classic Sports Cap,Accessories,349,20",
        "8903333001035,Fleece Winter Hoodie,Apparel,1599,12",
        "8901234567890,Steel Water Bottle 1L,Accessories,599,10",
        '80000000378472,"Sweatshirt (Off-White, M)",Apparel,949,25',
        # 5 Error rows (rows 12 to 16)
        ",No Barcode Item,Apparel,299,10",                        # Missing barcode
        "890999900002,,Accessories,399,10",                      # Missing name
        "890999900003,No Category Item,,499,10",                 # Missing category
        "890999900004,Invalid Price Item,Apparel,not_a_number,10",# Invalid price
        "890999900005,Negative Stock Item,Apparel,599,-5",       # Negative stock
        # 5 In-file duplicate rows (rows 17 to 21)
        "890700000001,Duplicate Tote,Accessories,450,10",       # Duplicate of row 2
        "890700000002,Duplicate Denim,Apparel,2499,5",          # Duplicate of row 3
        "8903333001011,Duplicate T-Shirt,Apparel,849,10",        # Duplicate of row 7
        "8903333001028,Duplicate Cap,Accessories,349,5",         # Duplicate of row 8
        '80000000378472,"Duplicate Sweatshirt",Apparel,949,15'     # Duplicate of row 11
    ]
    csv_content = "\n".join(csv_rows)

    # 7. Test POST /stores/{store_id}/products/import-preview
    print("\n4. Testing POST /stores/{store_id}/products/import-preview...")
    files = {"file": ("test_import_20.csv", csv_content.encode("utf-8"), "text/csv")}
    prev_resp = httpx.post(
        f"{API_BASE}/stores/{stylehub['id']}/products/import-preview",
        files=files,
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=15
    )
    assert prev_resp.status_code == 200, f"Expected 200, got {prev_resp.status_code} {prev_resp.text}"
    pdata = prev_resp.json()

    print(f"   Preview breakdown:")
    print(f"   - Total rows: {pdata['total_rows']}")
    print(f"   - Valid count: {pdata['valid_count']}")
    print(f"   - To Add count: {pdata['to_add_count']}")
    print(f"   - To Update count: {pdata['to_update_count']}")
    print(f"   - To Fail count: {pdata['to_fail_count']}")
    for err in pdata["failed"]:
        print(f"     Row {err['row']} barcode {err.get('barcode')}: {err['reason']}")

    assert pdata["total_rows"] == 20, f"Expected 20 total rows, got {pdata['total_rows']}"
    assert pdata["to_add_count"] == 5, f"Expected 5 to add, got {pdata['to_add_count']}"
    assert pdata["to_update_count"] == 5, f"Expected 5 to update, got {pdata['to_update_count']}"
    assert pdata["to_fail_count"] == 10, f"Expected 10 failed, got {pdata['to_fail_count']}"
    assert pdata["valid_count"] == 10, f"Expected 10 valid, got {pdata['valid_count']}"

    # Verify duplicate error reasons specifically mention in-file duplicates
    dup_errors = [e for e in pdata["failed"] if "Duplicate barcode in upload file" in e["reason"]]
    assert len(dup_errors) == 5, f"Expected 5 in-file duplicate errors, got {len(dup_errors)}"
    print("   Preview correctly identified 5 new, 5 updates, 5 invalid, 5 duplicates!")

    # 8. Test POST /stores/{store_id}/products/import (Execution)
    print("\n5. Testing POST /stores/{store_id}/products/import (Execution)...")
    files2 = {"file": ("test_import_20.csv", csv_content.encode("utf-8"), "text/csv")}
    exec_resp = httpx.post(
        f"{API_BASE}/stores/{stylehub['id']}/products/import",
        files=files2,
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=20
    )
    assert exec_resp.status_code == 200, f"Expected 200, got {exec_resp.status_code} {exec_resp.text}"
    edata = exec_resp.json()

    print(f"   Import execution result:")
    print(f"   - Status: {edata['status']}")
    print(f"   - Added: {edata['added_count']}")
    print(f"   - Updated: {edata['updated_count']}")
    print(f"   - Failed: {edata['failed_count']}")

    assert edata["status"] == "success"
    assert edata["added_count"] == 5
    assert edata["updated_count"] == 5
    assert edata["failed_count"] == 10

    # 9. Verify products in DB & per-store isolation
    print("\n6. Verifying products in database...")
    # Check updated price for T-Shirt in StyleHub
    tshirt_scan = httpx.get(
        f"{API_BASE}/products/by-barcode?store_id={stylehub['id']}&barcode=8903333001011",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    ).json()
    assert tshirt_scan["price"] == 849, f"Expected price 849, got {tshirt_scan['price']}"
    assert tshirt_scan["stock"] == 35, f"Expected stock 35, got {tshirt_scan['stock']}"

    # Check newly added product in StyleHub
    denim_scan = httpx.get(
        f"{API_BASE}/products/by-barcode?store_id={stylehub['id']}&barcode=890700000002",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    ).json()
    assert denim_scan["name"] == "Denim Jacket"
    assert denim_scan["price"] == 2499
    assert denim_scan["in_stock"] == True

    # Same newly added barcode in FreshMart must return 404
    fm_denim_scan = httpx.get(
        f"{API_BASE}/products/by-barcode?store_id={freshmart['id']}&barcode=890700000002",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    )
    assert fm_denim_scan.status_code == 404

    # 10. Test Re-import idempotency / zero duplicates
    print("\n7. Testing Re-import overwrite & zero duplicate rows...")
    files3 = {"file": ("test_import_20.csv", csv_content.encode("utf-8"), "text/csv")}
    re_resp = httpx.post(
        f"{API_BASE}/stores/{stylehub['id']}/products/import",
        files=files3,
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=20
    ).json()
    # Now all 10 valid items already exist in StyleHub, so added=0, updated=10!
    assert re_resp["added_count"] == 0
    assert re_resp["updated_count"] == 10
    assert re_resp["failed_count"] == 10

    # Verify count of denim jacket in DB is still strictly 1
    all_sh = httpx.get(f"{API_BASE}/stores/{stylehub['id']}/products", timeout=10).json()
    matching_denim = [p for p in all_sh if p["barcode"] == "890700000002"]
    assert len(matching_denim) == 1, f"Expected 1 row, got {len(matching_denim)}"
    print("   Zero duplicate rows verified after re-import.")

    # 11. RBAC Refusal
    print("\n8. Testing RBAC Refusal on Import Endpoints...")
    cust_prev = httpx.post(
        f"{API_BASE}/stores/{stylehub['id']}/products/import-preview",
        files={"file": ("test.csv", b"barcode,name,category,price,stock\n", "text/csv")},
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    )
    assert cust_prev.status_code == 403

    fm_mgr_import = httpx.post(
        f"{API_BASE}/stores/{stylehub['id']}/products/import",
        files={"file": ("test.csv", b"barcode,name,category,price,stock\n", "text/csv")},
        headers={"Authorization": f"Bearer {fm_mgr_token}"},
        timeout=10
    )
    assert fm_mgr_import.status_code == 403

    print("\n>>> ALL PART 3 ACCEPTANCE TESTS PASSED! <<<")

if __name__ == "__main__":
    main()

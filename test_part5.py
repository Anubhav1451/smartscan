import os
import asyncio
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

async def main_async():
    print("=== STARTING PART 5 ACCEPTANCE TESTS (HARDENING) ===")
    
    # 1. Login accounts
    print("1. Authenticating accounts...")
    customer_token = get_token("demo@smartscan.app")
    sh_mgr_token = get_token("manager-sh@smartscan.app")

    stores_resp = httpx.get(f"{API_BASE}/stores", timeout=10).json()
    stylehub = next(s for s in stores_resp if s["code"] == "SH")

    # 2. Race Safety Test (Atomic Stock conditional decrement)
    print("\n2. Testing Race Safety: Concurrent checkouts on last stock unit...")
    race_barcode = "8909999000100"
    
    # Delete old test product if any
    clean_headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }
    httpx.delete(
        f"{SUPABASE_URL}/rest/v1/products?store_id=eq.{stylehub['id']}&barcode=eq.{race_barcode}",
        headers=clean_headers,
        timeout=10
    )

    # Add product with EXACTLY 1 unit in stock
    add_resp = httpx.post(
        f"{API_BASE}/stores/{stylehub['id']}/products",
        json={
            "barcode": race_barcode,
            "name": "Exclusive Silk Tie",
            "category": "Accessories",
            "price": 500,
            "stock": 1
        },
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    )
    assert add_resp.status_code in (200, 201)

    # Customer creates 2 separate checkout orders for this 1 item
    c1 = httpx.post(
        f"{API_BASE}/checkout",
        json={"store_id": stylehub["id"], "items": [{"barcode": race_barcode, "qty": 1}], "payment_method": "UPI_MOCK"},
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    ).json()
    order1_id = c1["order_id"]

    c2 = httpx.post(
        f"{API_BASE}/checkout",
        json={"store_id": stylehub["id"], "items": [{"barcode": race_barcode, "qty": 1}], "payment_method": "UPI_MOCK"},
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    ).json()
    order2_id = c2["order_id"]

    print(f"   Created 2 pending orders: {order1_id[:8]} and {order2_id[:8]} competing for 1 unit.")

    # Fire 2 concurrent payments simultaneously
    async with httpx.AsyncClient() as client:
        t1 = client.post(
            f"{API_BASE}/orders/{order1_id}/mock-pay",
            headers={"Authorization": f"Bearer {customer_token}", "Idempotency-Key": f"race-1-{order1_id}"},
            timeout=10
        )
        t2 = client.post(
            f"{API_BASE}/orders/{order2_id}/mock-pay",
            headers={"Authorization": f"Bearer {customer_token}", "Idempotency-Key": f"race-2-{order2_id}"},
            timeout=10
        )
        res1, res2 = await asyncio.gather(t1, t2)

    statuses = [res1.status_code, res2.status_code]
    print(f"   Concurrent payment responses: {statuses}")
    
    # Exactly one must succeed (200) and the other must fail with 400
    assert 200 in statuses, f"Expected at least one 200, got {statuses}"
    assert 400 in statuses, f"Expected one 400 OUT_OF_STOCK, got {statuses}"

    failed_res = res1 if res1.status_code == 400 else res2
    assert "out of stock" in failed_res.text.lower(), f"Expected 'out of stock' error message, got {failed_res.text}"

    # Verify final stock in DB is 0, NEVER negative
    stock_check = httpx.get(
        f"{API_BASE}/products/by-barcode?store_id={stylehub['id']}&barcode={race_barcode}",
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    ).json()
    print(f"   Final stock in database: {stock_check['stock']}")
    assert stock_check["stock"] == 0, f"Expected stock 0, got {stock_check['stock']}"
    assert stock_check["in_stock"] == False
    print("   Race safety verified: exactly 1 order succeeded, stock is strictly 0 (never negative).")

    # 3. Rate Limiting Test
    print("\n3. Testing Rate Limiting (Burst Abuse)...")
    # Fire burst of 20 rapid requests to a write endpoint
    burst_statuses = []
    async with httpx.AsyncClient() as client:
        tasks = [
            client.post(
                f"{API_BASE}/checkout",
                json={"store_id": stylehub["id"], "items": [{"barcode": "8903333001011", "qty": 1}], "payment_method": "UPI_MOCK"},
                headers={"Authorization": f"Bearer {customer_token}"},
                timeout=5
            )
            for _ in range(18)
        ]
        burst_results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in burst_results:
            if hasattr(r, 'status_code'):
                burst_statuses.append(r.status_code)

    print(f"   Burst response codes: {set(burst_statuses)}")
    assert 429 in burst_statuses, f"Expected HTTP 429 in burst, got {burst_statuses}"
    print("   Rate limiting verified: abuse burst returns HTTP 429.")

    # 4. Double-Tap on Pay (Idempotency preservation)
    print("\n4. Testing Idempotent Double-Tap on Pay...")
    # Create an order
    new_order = httpx.post(
        f"{API_BASE}/checkout",
        json={"store_id": stylehub["id"], "items": [{"barcode": "8903333001011", "qty": 1}], "payment_method": "UPI_MOCK"},
        headers={"Authorization": f"Bearer {customer_token}"},
        timeout=10
    ).json()
    test_oid = new_order["order_id"]
    shared_key = f"double-tap-{test_oid}"

    # Pay tap 1
    tap1 = httpx.post(
        f"{API_BASE}/orders/{test_oid}/mock-pay",
        headers={"Authorization": f"Bearer {customer_token}", "Idempotency-Key": shared_key},
        timeout=10
    )
    assert tap1.status_code == 200
    bill1 = tap1.json()["bill_no"]

    # Pay tap 2 (immediate double tap)
    tap2 = httpx.post(
        f"{API_BASE}/orders/{test_oid}/mock-pay",
        headers={"Authorization": f"Bearer {customer_token}", "Idempotency-Key": shared_key},
        timeout=10
    )
    assert tap2.status_code == 200
    bill2 = tap2.json()["bill_no"]

    assert bill1 == bill2
    print(f"   Double-tap returned same bill ({bill1}) with status 200.")

    # 5. Error Hygiene Verification
    print("\n5. Testing Error Hygiene (No stack traces or SQL leaked)...")
    bad_req = httpx.post(
        f"{API_BASE}/stores/{stylehub['id']}/products",
        json={"invalid_field": 123},
        headers={"Authorization": f"Bearer {sh_mgr_token}"},
        timeout=10
    )
    assert bad_req.status_code == 422
    err_text = bad_req.text
    print(f"   Error response: {err_text}")
    assert "Traceback" not in err_text
    assert ".py" not in err_text
    assert "SELECT" not in err_text
    assert "INSERT" not in err_text
    assert "WHERE" not in err_text
    print("   Error hygiene verified: no internal tracebacks, paths or SQL leaked.")

    print("\n>>> ALL PART 5 HARDENING ACCEPTANCE TESTS PASSED! <<<")

if __name__ == "__main__":
    asyncio.run(main_async())


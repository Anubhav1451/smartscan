# SmartScan — API Specification (FastAPI)
File 05 of 15. Base URL: the Render deployment. All requests carry the
Supabase JWT: Authorization: Bearer <token>. Backend verifies the JWT and
the caller's role/store on every non-public route. Money is integer INR.
Errors: JSON {error: string, code: string} with proper HTTP status.

## Public / customer
GET  /stores → [{id, name, area, code}]
GET  /stores/{store_id}/products?search= → [{id, barcode, name, category,
     price, stock, in_stock}]
POST /scan {store_id, barcode} → 200 {product} | 404 PRODUCT_NOT_FOUND
     (not sold in this store) | 409 OUT_OF_STOCK
POST /orders {store_id} → creates CART order for the customer
POST /orders/{id}/items {barcode, qty} → backend resolves product in the
     order's store, checks stock, returns updated cart with backend totals
PATCH /orders/{id}/items/{item_id} {qty} → qty 0 removes the line
DELETE /orders/{id}/items/{item_id}
GET  /orders/{id} → cart/order with items, totals, status
POST /orders/{id}/pay/mock {method: UPI_MOCK} → validates stock, marks
     PAID, decrements stock, issues bill_no, status BILL_ACTIVE,
     returns {bill_no, qr_token, total}
POST /orders/{id}/pay/cash → status CASH_PENDING (no bill yet)
GET  /bills/{bill_no} → bill detail for the owner: store, items, total,
     status, qr_token

## Exit staff (role exit_staff, own store only)
GET  /staff/bills/{bill_no} → bill + billed item checklist for verification
POST /exit/verify {bill_no, bag_items: [product_id or barcode]} →
     VERIFIED (bill → VERIFIED_USED) | MISMATCH {extra_items} |
     ALREADY_USED (bill was already VERIFIED_USED)
GET  /staff/cash-pending → [orders in CASH_PENDING for the staff's store]
POST /staff/cash/{order_id}/confirm → decrements stock, issues bill_no,
     status BILL_ACTIVE; the customer's bill screen now shows ACTIVE

## Manager (role manager, own store only)
GET  /dashboard/{store_id}/summary → {today_sales, today_orders,
     digital_bills_total, low_stock_count, sales_last_7_days[],
     top_products[], recent_transactions[], impact{paper_saved_estimate,
     time_saved_estimate}}
GET/POST/PATCH /stores/{store_id}/products → list / add / edit price+stock
POST /admin/reset-demo → restores seed state (see 04_DATABASE.md)

## Notes
- Totals are ALWAYS computed by the backend from current product prices;
  order_items snapshot name+price at payment time.
- qr_token: an unguessable token tied to bill_no (e.g. signed payload);
  the QR encodes bill_no + token; staff scan parses both; manual bill_no
  entry is the fallback and skips the token check only for demo accounts
  (note this trade-off in README — prototype only).
- Cold start: Render free tier sleeps; the frontend must tolerate a slow
  first response with a "waking up the store…" loading state, not an error.

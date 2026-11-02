# SmartScan — Database Design (Supabase / PostgreSQL)
File 04 of 15. Keep this shape; the seed/reset script must restore exactly
the demo state described here in one run.

## Tables
retailers(id uuid pk, name text)
stores(id uuid pk, retailer_id fk, name text, area text, code text unique)
  - FreshMart (FM, Rajpur Road), StyleHub (SH), DailyNeeds (DN)
products(id uuid pk, store_id fk, barcode text, name text, category text,
  price int (INR, whole rupees), stock int)
  - UNIQUE (store_id, barcode) — the same barcode in another store is a
    different row with its own price/stock.
profiles(id uuid pk = Supabase Auth user id, role text:
  customer|exit_staff|manager, store_id fk nullable, display_name text)
orders(id uuid pk, bill_no text unique (format SS-20481), store_id fk,
  customer_id fk profiles, status text: CART|PAYMENT_PENDING|PAID|
  CASH_PENDING|BILL_ACTIVE|VERIFIED_USED|MISMATCH,
  payment_method text: UPI_MOCK|CARD_MOCK|CASH, total int,
  created_at timestamptz, paid_at timestamptz null)
order_items(id uuid pk, order_id fk, product_id fk, name_snapshot text,
  price_snapshot int, qty int)
exit_verifications(id uuid pk, order_id fk, staff_id fk profiles,
  result text: VERIFIED|MISMATCH|ALREADY_USED, bag_items jsonb,
  created_at timestamptz)

## Indexes / rules
- Index products(store_id, barcode); orders(store_id, created_at);
  orders(bill_no).
- bill_no: human-friendly sequential-looking numbers (seed a counter or
  derive from a sequence) — format SS-#####.
- RLS: enabled on all tables. Customers see only their own orders; staff and
  managers see only their store's rows. The backend uses the user's JWT and
  enforces the same rules server-side (RLS is the second wall, not the only
  one). Service-role key stays backend-only, in env, never in the frontend.

## Seed data (the reset must restore this exactly)
- 3 stores as above, under one demo retailer "SmartScan Demo Retail".
- FreshMart products (name, price, stock; barcodes = realistic EAN-13
  placeholders in seed, editable in Products screen — real stage-product
  barcodes replace them before the event):
  Amul Taaza Milk 500ml 62/40; Britannia Whole Wheat Bread 45/35;
  Head & Shoulders Shampoo 340ml 210/18; Maggi Masala Noodles 12-pack
  168/50; Tata Salt 1kg 28/60; Steel Water Bottle 1L 499/12;
  Parle-G Gold Biscuits 800g 120/45; one product at stock 0 (out-of-stock
  demo), e.g. Coca-Cola 750ml 40/0.
- StyleHub: the SAME Steel Water Bottle barcode at price 549, stock 7
  (multi-store proof), plus 3-4 apparel items (T-Shirt 799, Cap 299,
  Hoodie 1499) — the T-Shirt is the simulated-RFID demo prop.
- DailyNeeds: 4-5 basic items (list filler).
- Dashboard history: seed ~40 past orders across the last 7 days for
  FreshMart so KPIs/chart/top-products/recent-transactions look alive on
  first open (target ballpark: today's sales Rs 82,540, orders 1,204 is the
  design board's cumulative-style figure — seed plausible numbers and let
  real demo transactions add on top; numbers must come from data, never
  hard-coded in the UI).
- Demo accounts (Supabase Auth users + profiles): see 11_AUTH.md.

## Demo Reset (POST /admin/reset-demo + a script)
Deletes demo orders/verifications, restores product stock and the seeded
history, resets the bill counter to SS-20481. One command, idempotent,
safe to run between rehearsals. Manager Settings screen exposes it behind
a confirm dialog (manager role only).

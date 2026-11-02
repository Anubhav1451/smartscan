# SmartScan — Architecture
File 03 of 15. How the system is put together. Stack is LOCKED:
React (Vite) + Tailwind PWA / Python FastAPI / Supabase (PostgreSQL + Auth) /
ZXing JS barcode scanning. Hosting: Vercel (frontend) + Render (backend) +
Supabase (DB/Auth). All free tier.

## Shape
[Phone browser / PWA] --HTTPS--> [FastAPI backend] --SQL--> [Supabase Postgres]
        |                               |
        +-- Supabase Auth (login, JWT) -+  (FastAPI verifies the JWT)
Camera scanning (ZXing) runs on-device in the browser; only the decoded
barcode string goes to the backend.

## Responsibilities
- Frontend (React PWA): screens, camera scanning, QR display/scan, calling
  the API. It NEVER decides a final price, a total, or a payment result.
- Backend (FastAPI): the single source of truth — product lookup per store,
  cart totals, stock checks and decrements, order/bill state machine,
  payment (mock) transitions, exit verification, dashboard aggregates,
  demo reset. Role and store checks on every staff/manager route.
- Database (Supabase Postgres): all state. Row Level Security as a second
  wall behind backend checks.
- Auth (Supabase Auth): accounts and JWTs; profiles table maps a user to a
  role and (for staff/manager) a store.

## Multi-store rule (core design decision)
Every product, order and staff record carries store_id. A product is keyed
by (store_id, barcode) — the same barcode may exist in two stores with a
different price and stock, and a scan always resolves inside the selected
store. One cart belongs to exactly one store; switching stores with a
non-empty cart warns and clears the cart.

## Order / bill state machine
CART → PAYMENT_PENDING → PAID → BILL_ACTIVE → VERIFIED_USED
                     └→ (cash) CASH_PENDING → (staff confirm) → BILL_ACTIVE
BILL_ACTIVE → MISMATCH (bag check failed; under review)
A VERIFIED_USED bill scanned again → ALREADY_USED rejection.
Stock decrements at payment success (mock UPI) or at staff cash
confirmation — never at scan time. Prices are snapshotted into order_items
at payment time.

## Key flows
- Scan: browser decodes barcode → POST /scan {store_id, barcode} → backend
  returns product + stock state, or 404 (not in this store) / out-of-stock.
- Pay (mock UPI): POST /orders/{id}/pay/mock → backend checks stock, marks
  PAID, decrements stock, issues bill_no + QR token, status BILL_ACTIVE.
- Exit verify: staff scan bill QR → GET /bills/{bill_no} → staff run the
  simulated bag scan → POST /exit/verify {bill_no, bag_items} → backend
  compares bag vs billed items → VERIFIED (bill → USED) or MISMATCH.
- Dashboard: GET /dashboard/{store_id}/summary → aggregates from orders.

## Deployment and demo-day notes
- Frontend on Vercel (HTTPS — required for camera access). Backend on
  Render free tier: it SLEEPS when idle; first request can take 30-50s.
  Mitigation (locked): warm the backend 10 minutes before the demo and keep
  it warm; the app shows a friendly "waking up" state on cold start.
- Environments: one production deployment is the demo target; local dev
  uses the same Supabase project with the seed/reset script for clean data.
- PWA: installable, app-like; manifest name "SmartScan", theme #14532D.

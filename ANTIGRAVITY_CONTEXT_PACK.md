# SmartScan — Master Context Pack (for Antigravity or any AI builder)
# Attach the design image `design_g_smartscan_green.png` together with this file.
# Use order: (1) paste SECTION 1 as the first prompt, (2) save SECTION 2 as AGENTS.md in the repo root,
# (3) then give SECTION 4 phase prompts one at a time, in order. Never give all phases at once.

=====================================================================
SECTION 1 — MASTER PROMPT (paste first, with the design image attached)
=====================================================================

You are building "SmartScan", a working prototype of a multi-retailer Scan-and-Go
checkout web app, for a college hackathon final (HIMOVATION 2026, Solve-a-Thon:
AI for SDGs, 27-28 Nov 2026). It will be demonstrated LIVE on stage with real
products, real phone cameras and real barcode scanning. Reliability of the demo
flow matters more than feature count. Do not add any feature that is not listed
in this document. If anything here is ambiguous, ASK before inventing.

WHAT THE APP IS
- Retailers register their stores on SmartScan (in the prototype, stores are
  pre-seeded). A customer OPENS the app, SELECTS A STORE inside the app, scans
  product barcodes with the phone camera while shopping, pays inside the app,
  receives a digital bill with a QR code, and shows that QR at the exit.
  Exit staff scan the bill QR and verify the items. If the bag contains an item
  that was not billed, the exit screen must show a red MISMATCH alert.
- IMPORTANT: there is NO store-QR scan at entry. The customer selects the store
  from a list inside the app. Never build a "scan store QR to enter" step.
- Business model (for dashboard/copy only): B2B SaaS - retailers pay, customers
  shop free. Example store names in this document are fictional demo stores,
  NOT real brand partners. Never use real retail brand names or logos.

LOCKED TECH STACK (do not substitute)
- Frontend: React (Vite) + Tailwind CSS, built as a PWA. Mobile-first for
  customer and staff views; the retailer dashboard is desktop-first.
- Backend: Python FastAPI. The backend is the single source of truth for
  prices, stock and bill status. The frontend must never compute or decide a
  final price or a payment result by itself.
- Database: Supabase (PostgreSQL). Auth: Supabase Auth. All secret keys only in
  environment variables, never committed to the repo.
- Barcode scanning: ZXing JS (@zxing/browser) using the device camera, with a
  manual barcode-entry fallback on the same screen.
- QR codes: generate bill QR codes encoding a signed bill token/ID; staff side
  scans QR with the camera (same ZXing) plus manual bill-ID entry fallback.

DESIGN SYSTEM (match the attached image exactly - "Design G: SmartScan Green")
- Primary deep green: #14532D. Dark green (dashboard sidebar): #0C3B21.
- Background cream: #F6F2E7 / #F6EBD7. Light green tint surfaces: #E8F1E4, #EFF4E4.
- Ink text: #16130E / #16241B. Muted olive-grey text: #43543F.
- Success/Paid/Verified green: #16A34A / #22C55E. Pending amber: use a warm
  amber (approx #B45309 text on light amber bg). Alert red: ONLY for mismatch /
  errors (approx #DC2626). Used/expired bills: grey.
- Logo: a shopping bag with a check mark inside, deep green. Tagline:
  "Scan. Pay. Walk Out."
- Style: clean rounded cards (16-20px radius), soft shadows, generous spacing,
  one clear primary button per screen, big touch targets. The SCAN button/action
  is always the most prominent element in customer views. No gradients-and-glow
  "AI look", no clutter, no tiny text. UI language: English only.
- The attached image is the visual source of truth for: customer Home (store
  list), Store page (product grid + cart bar), Live Scan screen, Cart + payment
  success + bill QR screen, and the retailer Dashboard layout. The exit-staff
  screens are NOT in the image - design them in the same language (cream
  background, deep-green header, one big action, status colour semantics above).

DEMO DATA (seed exactly this; a seed/reset script must restore it in one run)
- Store 1 (main demo store): "FreshMart", Rajpur Road. Store code FM.
- Store 2 (proves multi-store): "StyleHub", apparel. Store code SH.
- Store 3 (list filler): "DailyNeeds". Store code DN.
- FreshMart products (name, price INR, starting stock):
  Amul Taaza Milk 500ml - 62 - 40 | Britannia Whole Wheat Bread - 45 - 35 |
  Head & Shoulders Shampoo 340ml - 210 - 18 | Maggi Masala Noodles 12-pack -
  168 - 50 | Tata Salt 1kg - 28 - 60 | Steel Water Bottle 1L - 499 - 12 |
  Parle-G Gold Biscuits 800g - 120 - 45 | (one product with stock 0 to demo
  out-of-stock). Barcodes: use realistic EAN-13 placeholder numbers in the seed;
  they will be replaced by real product barcodes before the event - keep
  barcodes editable in the Products screen and centralised in the seed file.
- Multi-store proof: the Steel Water Bottle barcode ALSO exists in StyleHub at
  a different price (549) and different stock - the same barcode must resolve
  per-store. One cart belongs to exactly one store; switching store with items
  in the cart must warn and clear the cart.
- Example completed bill used across design/demo: items Milk 62 + Bread 45 +
  Shampoo 210 = total 317, Bill ID format SS-20481.
- Demo accounts (seeded): customer demo login (one-tap "Demo Customer" button
  plus a normal email/password account), exit staff account for FreshMart,
  store manager account for FreshMart. Simple demo passwords, listed in README.

SCREENS (build exactly these; nothing more)
CUSTOMER (mobile web/PWA):
 1. Login - email/password + one-tap "Continue as Demo Customer".
 2. Home / Store Select - greeting, search, store cards (logo initials, name,
    area), category chips. This matches the attached image.
 3. Store Home - product grid (image placeholder, name, price, stock state),
    product search, cart summary bar ("3 items - Rs 317 - View Cart").
 4. Scanner - full camera view, scan frame overlay, last-scanned product card,
    "type barcode manually" fallback, torch if available. Adding a product
    plays a clear success state; unknown barcode shows "Product not found in
    this store"; zero stock shows "Out of stock" and does not add.
 5. Cart - quantity +/-, remove item, per-line totals, grand total, stock
    re-check, "Proceed to Pay".
 6. Payment - order summary; two methods: (a) Mock UPI - shows a fake UPI
    payment sheet with a 1-2s "processing" state, then success. This is a
    MOCK: no real money, no real gateway; small print on screen: "Demo payment
    - no real money is charged." (b) Pay by Cash - creates a "Cash - Staff
    confirmation pending" state; the bill activates only when staff confirm.
 7. Bill / Success - "Payment Successful", big QR code of the bill, Bill ID,
    store, total, items summary, "Show this at the Exit" instruction. Bill
    states: ACTIVE -> VERIFIED/USED (after exit) or MISMATCH (under review).
EXIT STAFF (mobile web, same login system, staff role):
 8. Verify Home - "Scan Bill QR" big button + manual Bill ID entry.
 9. Verification Result - bill details + billed item checklist; a clearly
    labelled SIMULATION panel: "Simulated RFID Bag Scan" with a "Run Bag Scan"
    button and a hidden pre-set list of bag items (staff can toggle one extra
    item before the demo). If bag items == billed items: big green VERIFIED,
    bill becomes USED. If an extra item is in the bag: big red MISMATCH alert
    listing the extra item; bill stays under review. Scanning an already-USED
    bill: grey/red "Bill Already Used" rejection.
 10. Cash Confirmations - list of pending cash payments for the store; Confirm
    button activates that customer's bill (customer screen updates to ACTIVE).
RETAILER / MANAGER (desktop web):
 11. Dashboard - dark-green sidebar (logo, nav: Overview, Products, Orders,
    Settings), KPI cards (Today's Sales Rs 82,540; Orders 1,204; Digital Bills
    3,680; Low-Stock Items 24), sales bar chart (last 7 days), Top Products
    list, Recent Transactions table (Bill ID, items, amount, method UPI/Card/
    Cash, status incl. one "Cash - Staff Pending" row), and an IMPACT panel:
    digital bills issued, estimated paper saved, estimated checkout time saved.
    These analytics come from real transaction data in the DB - no fake "AI"
    labels anywhere.
 12. Products - table with search; Add Product (name, barcode, price, stock,
    category); Edit price/stock. Changes reflect in the customer app.
 13. Settings / Demo Tools - "Reset Demo Data" button (runs the seed reset,
    with a confirm step) and the store's demo account list.

DATA MODEL (Supabase Postgres; keep it this shape)
 retailers(id, name) ; stores(id, retailer_id, name, area, code) ;
 products(id, store_id, barcode, name, category, price, stock) - unique
 (store_id, barcode) ; users handled by Supabase Auth + profiles(id, role:
 customer|exit_staff|manager, store_id nullable) ;
 orders(id, bill_no, store_id, customer_id, status: CART|PAYMENT_PENDING|
 PAID|CASH_PENDING|BILL_ACTIVE|VERIFIED_USED|MISMATCH, payment_method:
 UPI_MOCK|CARD_MOCK|CASH, total, created_at) ;
 order_items(id, order_id, product_id, name_snapshot, price_snapshot, qty) ;
 exit_verifications(id, order_id, staff_id, result: VERIFIED|MISMATCH|
 ALREADY_USED, bag_items jsonb, created_at).
 Prices/stock on an order always come from the backend at scan and at payment
 time (snapshot into order_items). Stock decrements when payment succeeds
 (or when cash is confirmed), never at scan time.

API (FastAPI; indicative endpoints - keep names close to these)
 GET /stores ; GET /stores/{id}/products?search= ; POST /scan {store_id,
 barcode} -> product or 404/out-of-stock ; POST /orders (create cart) ;
 POST /orders/{id}/items ; PATCH /orders/{id}/items/{item_id} ;
 POST /orders/{id}/pay/mock -> PAID + bill ; POST /orders/{id}/pay/cash ->
 CASH_PENDING ; POST /staff/cash/{order_id}/confirm ; GET /bills/{bill_no} ;
 POST /exit/verify {bill_no, bag_items[]} -> VERIFIED|MISMATCH|ALREADY_USED ;
 GET /dashboard/{store_id}/summary ; CRUD /stores/{id}/products ;
 POST /admin/reset-demo.
 Auth: verify Supabase JWT in FastAPI; role checks on staff/manager routes;
 a store's staff/manager can only see their own store's data.

HONESTY RULES (never violate in UI copy, code comments or README)
 - Payment is a MOCK. RFID is SIMULATED. Both are labelled as such on screen.
 - Dashboard insights are rule-based analytics on transaction data, NOT AI.
   AI demand forecasting / queue prediction / anomaly detection are roadmap
   items - mention them only in a README "Roadmap" section, never as features.
 - No real brand names/logos for stores. Fictional demo stores only.

DEMO SCRIPT the app must support flawlessly (this is the acceptance test)
 1. Customer selects FreshMart, scans Milk, Bread, Shampoo (real barcodes),
    cart shows Rs 317. 2. Pays by Mock UPI -> success -> bill QR (SS-xxxxx)
    ACTIVE; stock reduced by the bought quantities. 3. At exit, staff scan the
    bill QR, run Simulated Bag Scan with matching items -> VERIFIED (green),
    bill becomes USED. 4. Staff scan the same QR again -> "Already Used"
    rejection. 5. New bill; this time the bag contains one extra unscanned
    item -> red MISMATCH alert. 6. Cash path: customer chooses Cash -> staff
    confirm on their screen -> bill becomes ACTIVE. 7. Dashboard shows the new
    sales, updated stock (bottle/milk counts down), low-stock and Impact panel
    updated. 8. Same bottle barcode inside StyleHub shows Rs 549, not 499.

OUT OF SCOPE (do NOT build): real payment gateway, real RFID hardware, POS
 integration, self-serve retailer onboarding, CSV import, returns/refunds,
 loyalty points, Hindi UI, native apps, delivery features.

WORKING RULES
 - Build phase by phase (SECTION 4). Finish one phase, run it, show it
   working, commit to Git with a clear message, then wait for the next phase
   prompt. Never jump ahead.
 - After each phase, write a short "What works / What to test" note in README.
 - If a library or approach in this document fails, stop and report the exact
   error instead of silently switching the stack or the design.
 - Keep the design tokens above as CSS variables/Tailwind config in ONE place.

=====================================================================
SECTION 2 — AGENTS.md (save as repo-root AGENTS.md; permanent rules)
=====================================================================
# SmartScan build rules
- Source of truth: the Master Context Pack (scope, stack, design tokens, data
  model). If code and the pack disagree, the pack wins; flag the conflict.
- Backend (FastAPI) decides prices, totals, stock and bill status. Frontend
  never finalises a price or a payment result.
- Payment is MOCK only; RFID is SIMULATED only; both labelled on screen.
  Analytics are rule-based; never label anything "AI-powered" in the UI.
- Stores are fictional demo stores. No real brand names or logos anywhere.
- Customer selects the store inside the app. There is NO store-QR entry step.
- Design tokens live in one config (Tailwind theme/CSS variables): primary
  #14532D, dark #0C3B21, cream #F6F2E7, ink #16130E, success #16A34A.
  Cream background, deep-green headers/buttons, rounded cards, big targets.
- UI language: English only. Mobile-first customer/staff; desktop dashboard.
- Secrets only in .env (never commit). .env.example lists variable names only.
- One phase at a time; commit after each working phase with a clear message;
  update README "What works / What to test" after each phase.
- Seed/reset script must restore the exact demo data in one command.
- Do not add features outside the pack's scope list. Propose, don't invent.

=====================================================================
SECTION 3 — THE DESIGN IMAGE (what to attach and what to copy from it)
=====================================================================
Attach the file: design_g_smartscan_green.png (the "Design G" board).
Copy from it: overall layout of Home/store list, Store page with product grid
and the bottom cart bar, the Live Scan screen with the detected-product card,
the Cart + Payment Successful + QR screen, and the full Dashboard (dark-green
sidebar, KPI cards, bar chart, top products, recent transactions).
Do NOT copy: any text glitches from the image (it is a concept board); use the
real copy/data from Section 1. The exit-staff screens are not in the image -
create them in the same visual language.

=====================================================================
SECTION 4 — PHASE PROMPTS (give one at a time, in this order)
=====================================================================
PHASE 0 — SETUP: "Create the project skeleton only: Vite React + Tailwind PWA
frontend, FastAPI backend folder, Supabase schema SQL for the data model in
the pack, seed script with the exact demo data, .env.example, README with
setup steps and demo accounts. No app features yet. Show the folder tree and
confirm the schema runs."

PHASE 1 — DESIGN GATE: "Build only three screens with mocked data, pixel-close
to the attached design image: Customer Home/Store Select, Store Home with
product grid + cart bar, and the Live Scan screen UI (camera placeholder is
fine). Use the exact design tokens. Stop after these three for approval."

PHASE 2 — CORE FLOW: "Wire the full spine with real backend + DB: login/demo
login, store select, ZXing camera scanning with manual fallback, cart with
qty edit and backend totals, stock checks, Mock UPI payment (labelled mock),
bill generation with QR and ACTIVE status, stock decrement on payment, staff
bill scan + verification -> VERIFIED/USED, and re-scan rejection. Follow the
demo script steps 1-4 in the pack as the acceptance test."

PHASE 3 — LOCKED EXTRAS: "Add: second store StyleHub with the same bottle
barcode at Rs 549 (per-store resolution); cash flow (customer CASH_PENDING ->
staff Cash Confirmations screen -> bill ACTIVE); Simulated RFID bag scan with
the staff pre-set toggle and the MISMATCH path; full Dashboard (KPIs, 7-day
chart, top products, recent transactions, Impact panel) from real data;
Products add/edit; Settings with Reset Demo Data. Acceptance: demo script
steps 5-8."

PHASE 4 — HARDENING: "Test pass on real Android Chrome: camera permission
flow, scanning speed, offline/weak-network behaviour messages, PWA install,
all empty/error states (product not found, out of stock, already-used bill,
empty cart). Fix bugs, keep a bug list in README, no new features."

PHASE 5 — DEMO READY: "Final polish only: loading states, success animations
matching the design language, README demo-day checklist (accounts, reset steps,
warm-up steps), and a one-page 'How to run the 4-minute demo' script in the
repo. No new features."

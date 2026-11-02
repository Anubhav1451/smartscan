# SmartScan — Scan. Pay. Walk Out.

A multi-retailer Scan-and-Go checkout web app (working prototype) built for **HIMOVATION 2026**, Solve-a-Thon: AI for SDGs, by **Team IDEONIX**.

SmartScan eliminates checkout queues in physical retail: customers select a store directly inside the app, scan product barcodes using their phone camera, complete in-app checkout, and exit after seamless staff digital bill verification.

---

## What is Real vs Prototype (Honesty Box)

- **REAL**: In-app store selection, device camera barcode scanning (ZXing), per-store product catalogs and pricing, cart calculations, active bill lifecycle with signed QR, exit verification with duplicate-use rejection, mismatch alerts on unbilled bag items, and live dashboard analytics calculated directly from real transaction data.
- **MOCK**: Payments (no real payment gateway, no credit card processing, no live banking transactions; labelled as demo payment on screen).
- **SIMULATED**: RFID bag scanning (staff-operated simulation panel with configurable prop items; labelled as simulated RFID on screen).
- **ROADMAP (Not Built / Future Vision)**: Razorpay Route / Cashfree Easy Split multi-vendor payouts, physical RFID gate hardware integration, retailer POS/ERP inventory synchronization, and AI demand forecasting / queue prediction. Never presented as working features.

---

## Locked Tech Stack

- **Frontend**: React (Vite) + Tailwind CSS, configured as a mobile-first Progressive Web App (PWA) with desktop-first retailer dashboard.
- **Backend**: Python FastAPI (authoritative single source of truth for pricing, totals, inventory, and order/bill status).
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security + Supabase Auth with JWT verification).
- **Scanning**: ZXing JS (`@zxing/browser`) for on-device camera decoding with manual barcode entry fallback.
- **Hosting Targets**: Vercel (Frontend HTTPS), Render (Backend FastAPI), Supabase (DB & Auth) — all free tiers.

---

## Local Setup & Run

### 1. Prerequisites
- Node.js (v18+) and npm
- Python (3.10+)

### 2. Environment Variables
Copy `.env.example` to `.env` in the project root:
```bash
cp .env.example .env
```
Fill in your Supabase project URL and service role / anon keys.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
# App runs at http://localhost:5173
```

### 4. Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# API runs at http://localhost:8000 (Swagger docs at http://localhost:8000/docs)
```

### 5. Database Setup & Seed
1. Run `backend/schema.sql` inside your Supabase SQL Editor.
2. Populate the demo dataset and accounts:
```bash
cd backend
python seed.py
```
*(Or call `POST /admin/reset-demo` with `{"confirm": true}` via manager role or API docs).*

---

## Demo Accounts (Prototype Only)

All seeded demo accounts share one common password: **`SmartScanDemo2026!`**

| Role | Email | Assigned Store | Purpose |
| :--- | :--- | :--- | :--- |
| **Customer (Generic)** | `demo@smartscan.app` | None (selects in-app) | One-tap "Continue as Demo Customer" login |
| **Customer (Named)** | `anubhav@smartscan.app` | None (selects in-app) | "Hello, Anubhav!" personalized demo flow |
| **Exit Staff** | `staff@smartscan.app` | FreshMart (`FM`) | Exit QR scanning, cash confirmation, RFID simulation |
| **Store Manager** | `manager@smartscan.app` | FreshMart (`FM`) | Desktop dashboard analytics, products management, demo reset |

---

## The 4-Minute Demo (Quick Checklist)

1. **Warm Up**: Ping Render backend 10 minutes prior to prevent cold start latency.
2. **Reset**: Trigger *Reset Demo Data* from the Manager Settings or API.
3. **Devices**: 
   - Phone A (Customer): Log in as `anubhav@smartscan.app`.
   - Phone B (Exit Staff): Log in as `staff@smartscan.app`.
   - Laptop (Manager): Log in as `manager@smartscan.app` on the Dashboard.
4. **Walkthrough**: Execute the 8-step demo script (see `docs/14_TESTING.md`).
5. **Backup**: Maintain the pre-recorded offline run video on a USB flash drive.

---

## What Works / What to Test (Living Section)

### Phase 0: Foundation & Setup (Completed & Verified)
- [x] **Project Structure**: Clean separation of `frontend/`, `backend/`, and `docs/`.
- [x] **Design Tokens**: Defined in `frontend/tailwind.config.js` and `frontend/src/index.css` matching Design G (`#14532D`, `#0C3B21`, `#F6F2E7`, `#16130E`, `#16A34A`, `#B45309`, `#DC2626`).
- [x] **Frontend Build**: Verified clean `npm run build` using Vite + React + Tailwind CSS.
- [x] **Backend API**: Verified FastAPI app import, health check (`GET /`), and `/admin/reset-demo` endpoint.
- [x] **Database Schema**: Full PostgreSQL schema in `backend/schema.sql` (all 7 tables, functions, indexes, and RLS policies active).
- [x] **Database Seed Execution**: Executed `backend/seed.py` against live Supabase project.
  - Verified 3 stores (`FM`, `SH`, `DN`).
  - Verified 16 products catalogued with EAN-13 barcodes.
  - Verified multi-store pricing (Steel Water Bottle resolves to ₹499 in FreshMart and ₹549 in StyleHub).
  - Verified 40 total orders seeded (canonical bill `SS-20481`, 2 recent demo orders, and 37 orders across past 7 days).
  - Verified 4 profiles bound to appropriate roles and store IDs.
- [x] **Live Auth Test**: Verified password sign-in against Supabase Auth API using demo customer credentials (`demo@smartscan.app`).
- [x] **One-Click Reset Verified**: Called `POST /admin/reset-demo` and confirmed identical state restoration.

### Phase 1: Design Gate (Approved)
- [x] **Design Tokens**: Standardized strictly in `tailwind.config.js` and `src/index.css` with 0 arbitrary hex codes.
- [x] **Screen 1 — Home / Store Select**: In-app store selection (FreshMart, StyleHub, DailyNeeds), personalized greeting, search, categories, and scan banner.
- [x] **Screen 2 — Store Home (FreshMart)**: Real seeded 8-product catalog, interactive category filter, out-of-stock badge on Coca-Cola, and sticky bottom cart bar (`3 items | ₹317 ->`).
- [x] **Screen 3 — Scanner UI**: Camera viewfinder shell with corner brackets, barcode illustration, torch toggle, manual entry fallback, and detected product card.
- [x] **Screenshots Captured**: Stored at `screenshots/phase1/` (`home.png`, `store.png`, `scanner.png`) for design gate review.

### Phase 2: Core Flow — Live API, Scan, Cart, Mock Pay, Bill QR, Exit Gate (Completed & Verified)
- [x] **Supabase JWT Middleware & Server Profile**: Fast JWT verification with PyJWKClient (ES256 asymmetric ECC) + legacy HS256 fallback; user profile (`role`, `store_id`) resolved strictly server-side from PostgreSQL via `GET /auth/me`.
- [x] **Backend Endpoints (`FastAPI`)**:
  - `GET /stores` — Returns live list of stores.
  - `GET /stores/{id}/products?search=` — Catalog with real prices & stock for the specified store.
  - `GET /products/by-barcode?store_id=&barcode=` — Scans/lookups by barcode scoped to a store (404 if not found in that store).
  - `POST /checkout` — Server-side item & stock validation, authoritative price calculation, creates `PENDING_PAYMENT` order.
  - `POST /orders/{id}/mock-pay` — Validates `Idempotency-Key`, atomically decrements inventory, creates active bill with signed `SMARTSCAN|BILL|...` QR payload.
  - `POST /orders/{id}/pay/cash` — Customer places cash order into `PENDING_PAYMENT`.
  - `GET /staff/cash-pending` — Exit staff lists pending cash orders for their store.
  - `POST /orders/{id}/cash-confirm` — Exit staff confirms cash payment, transitions order to `PAID`, decrements stock, activates bill.
  - `POST /exit/verify` — Validates bill at exit gate (`VERIFIED`, `ALREADY_USED`, `INVALID`, `WRONG_STORE`).
  - `POST /exit/use` — Exit staff marks bill as used and logs exit verification in database.
- [x] **Frontend Live Flow (`React + Tailwind PWA`)**:
  - **Login**: Design G login with "Continue as Demo Customer" and staff demo login, routing by role (`customer` -> Home, `exit_staff` -> Staff Home, `manager` -> Manager Placeholder).
  - **Home & Store**: Live store list, store home catalog with real pricing, search filter, and cross-store cart clearing guard.
  - **Scanner**: Real continuous barcode decoding via `@zxing/browser`, torch toggle with camera track capability detection, haptic vibration, manual entry, and product status cards (Detected, Out of Stock, Not Found).
  - **Cart**: Live item steppers, server total preview, per-store local persistence, cross-store guard.
  - **Payment**: Authoritative server total, mock UPI row selection, cash option, ~1.2s realistic processing delay, idempotent submission.
  - **Bill**: Real exit QR rendered via `qrcode.react`, active status pill, itemized receipt, and "Show at Exit" layout.
  - **Exit Staff Gate**: QR scanning + manual bill lookup, status badges (`VERIFIED` green, `ALREADY USED` amber, `INVALID` red, `WRONG STORE` red), and Cash Payments Pending verification list.
- [x] **Automated Self-Test Results (a)-(h)**:
  - (a) Demo login lands on Home with real stores: **PASSED**
  - (b) Multi-store pricing check (Water Bottle ₹499 in FM vs ₹549 in SH): **PASSED**
  - (c) Unknown barcode `0000000000000` shows Not Found card: **PASSED**
  - (d) Coca-Cola (stock 0) blocked from adding: **PASSED**
  - (e) Canonical checkout (Milk + Bread + Shampoo) totals ₹317 from server, mock pay creates active bill with QR: **PASSED**
  - (f) Stock decrement: FreshMart bottle stock drops 12 -> 11 upon purchase: **PASSED**
  - (g) Exit verification lifecycle (`VERIFIED` -> `ALREADY USED` -> `INVALID` on fake ID): **PASSED**
  - (h) Cash payment flow: order in cash-pending list, staff confirmation activates customer bill: **PASSED**
- [x] **Screenshots Captured**: 11 screenshots saved in `screenshots/phase2/` (`login.png`, `home.png`, `store.png`, `scanner-found.png`, `scanner-notfound.png`, `cart.png`, `payment.png`, `bill.png`, `exit-verified.png`, `exit-used.png`, `cash-list.png`).



# README — SmartScan (template the repo README must follow)
File 07 of 15. The repo's README.md must contain these sections, filled
with the real values once setup is done.

## SmartScan — Scan. Pay. Walk Out.
A multi-retailer Scan-and-Go checkout web app (working prototype) built for
HIMOVATION 2026, Solve-a-Thon: AI for SDGs, by Team IDEONIX.
Customers select a store in the app, scan barcodes with the phone camera,
pay in the app, and exit with a QR digital bill after staff verification.

## What is real vs prototype (honesty box — keep this in the README)
- REAL: store selection, camera barcode scanning, per-store pricing/stock,
  cart, bill lifecycle, exit verification, mismatch + already-used checks,
  dashboard analytics from real transaction data.
- MOCK: payments (no real money, no gateway).
- SIMULATED: RFID bag matching (staff-run simulation panel).
- ROADMAP (not built): Razorpay/Cashfree split payments to retailers,
  real RFID hardware pilot, POS integration, AI demand forecasting and
  queue prediction.

## Stack
React (Vite) + Tailwind PWA · Python FastAPI · Supabase (PostgreSQL +
Auth) · ZXing JS · Hosting: Vercel + Render + Supabase (free tiers).

## Run locally
(frontend: npm install, npm run dev · backend: pip install -r
requirements.txt, uvicorn main:app --reload · env from .env.example ·
seed: run the seed script in /backend or /scripts)

## Demo accounts (prototype only — simple passwords by design)
customer: demo@smartscan.app (or one-tap "Continue as Demo Customer")
exit staff (FreshMart): staff@smartscan.app
manager (FreshMart): manager@smartscan.app
Passwords are set at seed time and listed here once created.

## The 4-minute demo (checklist summary; full script in repo)
Warm the backend 10 min early → Reset Demo Data → login on Phone A
(customer) and Phone B (staff), laptop on dashboard → run the 8-step
script from docs/14_TESTING.md → keep the offline backup video ready.

## What works / What to test
(A living section — updated after every build phase, per AGENTS.md.)

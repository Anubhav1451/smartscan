# SmartScan — Product Requirements Document (PRD)
File 01 of 15. Source of truth for WHAT is being built and WHY.

## 1. Product in one line
SmartScan is a multi-retailer Scan-and-Go checkout web app: the customer
selects a store inside the app, scans product barcodes with the phone camera,
pays in the app, gets a QR digital bill, and exits after staff verification.
Tagline: "Scan. Pay. Walk Out."

## 2. Context
- Built for HIMOVATION 2026 (Solve-a-Thon: AI for SDGs) final round,
  27-28 Nov 2026, SRHU Jolly Grant, Dehradun. Team IDEONIX (4 members).
- This is a WORKING PROTOTYPE demonstrated live on stage with real products,
  real phone cameras and real barcode scanning. Demo reliability > features.
- Business model (product truth, for copy/dashboard): B2B SaaS — retailers
  pay a subscription; customers shop free. Funding ask in the pitch: Rs 6.5
  lakh (planning estimate).

## 3. Users and roles
- Customer: shops, scans, pays, shows bill QR at exit.
- Exit Staff (per store): verifies bill QRs, confirms cash payments, runs the
  simulated RFID bag check.
- Store Manager / Retailer (per store): dashboard, products, demo tools.
- Platform admin: not a UI role in the prototype; handled via seed/admin API.

## 4. The one flow that must never break (core journey)
Select store (inside the app — there is NO store-QR scan at entry) → scan
barcodes → cart with backend-computed totals → pay (mock UPI, or cash with
staff confirmation) → digital bill with QR (ACTIVE) → exit staff scan →
VERIFIED and bill becomes USED → re-scanning a used bill is rejected.
Plus the security case: bag contains an item that was not billed → red
MISMATCH alert on the staff screen.

## 5. Scope
IN (locked): store select; camera barcode scan (ZXing) + manual entry;
cart qty edit/remove; per-store products and stock (same barcode can have a
different price/stock in another store); one cart = one store; mock UPI
payment; cash flow with staff confirmation; bill QR lifecycle (ACTIVE →
VERIFIED/USED or MISMATCH); already-used bill rejection; product-not-found
and out-of-stock states; exit verification; SIMULATED RFID bag scan with a
staff pre-set toggle; retailer dashboard (sales KPIs, 7-day chart, top
products, recent transactions, low stock, Impact panel: digital bills /
paper saved / time saved — all computed from real transaction data);
product add/edit; one-command demo data reset; roles (customer, exit staff,
manager) with seeded demo accounts; one-tap demo customer login.
OUT (do NOT build): real payment gateway; real RFID hardware; POS
integration; self-serve retailer onboarding; CSV import; returns/refunds;
loyalty; Hindi UI; native mobile apps; delivery.

## 6. Demo stores and data (fictional — never real brand names/logos)
FreshMart (Rajpur Road, main demo store), StyleHub (apparel, second store
proving multi-store pricing), DailyNeeds (third store for the list).
Canonical demo bill: Milk Rs 62 + Bread Rs 45 + Shampoo Rs 210 = Rs 317,
Bill ID format SS-20481. Full seed list in 04_DATABASE.md / seed script.

## 7. Honesty rules (product-level, non-negotiable)
- Payment is a MOCK and is labelled "Demo payment" on screen.
- RFID is SIMULATED and labelled "Simulated RFID" on screen.
- Dashboard insights are rule-based analytics on transaction data — never
  labelled AI. AI forecasting / queue prediction / anomaly detection are
  roadmap only (README), never presented as working features.
- Stores are fictional demo stores; no real retailer is a partner.

## 8. Success criteria (acceptance = the 8-step demo script)
1) FreshMart: scan Milk+Bread+Shampoo with real barcodes → cart Rs 317.
2) Mock UPI pay → success → bill QR ACTIVE; stock decremented.
3) Staff scan bill QR + matching bag scan → VERIFIED (green); bill USED.
4) Same QR again → "Already Used" rejection.
5) New bill + one extra unscanned item in bag → red MISMATCH.
6) Cash path: customer picks Cash → staff confirm → bill ACTIVE.
7) Dashboard reflects the new sales, stock and Impact numbers.
8) Same bottle barcode in StyleHub shows Rs 549 (FreshMart: Rs 499).
All 8 must pass on real Android phones before 20 Nov 2026 (code freeze).

## 9. Constraints
- Zero budget: free tiers only (Vercel + Render + Supabase).
- Deadline: event 27 Nov 2026; code freeze 20 Nov 2026.
- Devices: mid-range Android phones, Android Chrome; dashboard on a laptop.

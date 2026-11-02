# SmartScan — Integrations
File 13 of 15. What connects to what. Everything here is free tier.

## Live integrations (in the prototype)
1. Supabase — database (PostgreSQL) + Auth. Frontend uses the anon key +
   the user's JWT; backend uses the service-role key (server-side only)
   and verifies JWTs. Project region: closest to India available.
2. Vercel — hosts the React PWA; connected to the GitHub repo; HTTPS by
   default (required for camera). Env: VITE_API_BASE_URL,
   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
3. Render — hosts FastAPI (uvicorn). Env: Supabase keys/secret, allowed
   origins = the Vercel domain + localhost. Free tier sleeps when idle —
   demo-day warm-up is part of the SOP (10 min before, keep pinging).
4. ZXing JS (@zxing/browser) — in-browser barcode decoding from the
   camera (EAN-13/UPC/Code-128). No external service; runs on-device.
   Fallback: manual barcode entry (always available in UI).
5. QR generation — a standard JS QR library renders the bill QR from
   bill_no + token (frontend) — no external API calls (must work on
   flaky venue Wi-Fi once the page is loaded).
6. PWA — manifest + service worker (app shell caching only; data always
   fresh from the API — do not cache API responses with order/bill data).

## Stage tooling (not code, but part of the demo system)
- scrcpy (USB) to mirror the customer phone to the laptop/projector.
- Team hotspot as backup network; offline screen-recording of a perfect
  demo run as the last-resort backup (laptop + phone + pen drive).

## Future integrations (ROADMAP ONLY — do not build, do not imply built)
- Razorpay Route / Cashfree Easy Split: split payments straight to each
  retailer's bank account (~2% + GST), webhook = the only source of truth
  for PAID, bill QR marked USED after exit. SmartScan never holds funds.
- Real RFID readers at exit gates; POS/inventory sync for retailers;
  push notifications for low stock. Mention only in README roadmap.

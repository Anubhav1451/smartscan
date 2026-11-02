# SmartScan — Debugging Playbook
File 15 of 15. Known traps for THIS stack and demo. Check here before
inventing fixes. Report errors exactly (screenshot + console text +
steps) — never silently switch libraries or redesign to dodge a bug.

## Camera / scanning
- Camera does nothing / black screen: page is not HTTPS or not
  localhost → use the Vercel link. Permission denied → browser site
  settings; the manual-entry path must still complete the demo.
- ZXing decodes slowly: prefer the rear camera, pass continuous decode
  with TRY_HARDER hints, keep the video element mounted (do not unmount
  on route change mid-scan), and test on the real products — glossy
  packaging may need the torch or a slight angle. If one phone model is
  hopeless, that phone becomes the dashboard/backup phone, not a
  scanner.
- Barcode reads but product "not found": check the store — the barcode
  is keyed per (store_id, barcode). Seed placeholders vs the REAL stage
  product barcodes: update via Products screen or seed, then Reset.

## Backend / hosting
- First request hangs 30-50s: Render free tier was asleep. Expected.
  Frontend must show the waking-up state and retry once; demo SOP warms
  the backend 10 minutes before. Do not "fix" by removing the backend.
- CORS errors: ALLOWED_ORIGINS on Render must include the exact Vercel
  domain (and localhost:5173 for dev). A changed Vercel preview domain
  is the usual culprit — use the stable production domain.
- 401/403 everywhere: JWT not attached, or Supabase project mismatch
  between frontend keys and backend verification settings. Check that
  both sides point at the SAME project.
- RLS blocking reads/writes: verify profile row exists for the user
  (seed creates it); test with the service-role key to separate "RLS
  says no" from "data is missing".

## Data / state bugs
- Double stock decrement or double bill: guard pay/confirm endpoints by
  order status (only PAYMENT_PENDING → PAID, only CASH_PENDING →
  confirmed); make both endpoints idempotent.
- Totals differ between cart and bill: totals must come from ONE
  backend function; order_items snapshot at payment time — never let
  the frontend send a total.
- Dashboard numbers look frozen: they are aggregates over orders —
  check the demo orders' store_id and created_at (timezone: store the
  demo "today" in IST on the backend when aggregating).
- After rehearsals the data is a mess: run Reset Demo Data (Settings or
  POST /admin/reset-demo). Never hand-edit rows mid-rehearsal.

## When stuck — the escalation format
Send: (1) which demo-script step (14_TESTING.md), (2) device + browser,
(3) screenshot or screen recording, (4) exact error text from console /
network tab, (5) what was expected. Muse reviews against these docs
and returns the fix or the next instruction. No silent stack changes.

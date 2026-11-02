# SmartScan — Testing Plan
File 14 of 15. Testing is demo-driven: if the 8-step script passes on
real phones in a noisy room, the build is ready. Freeze: 20 Nov 2026.

## The acceptance test (run in full at every phase gate from Phase 2)
1. FreshMart: scan Milk + Bread + Shampoo (REAL stage-product barcodes)
   → cart total Rs 317, stock states correct.
2. Mock UPI pay → success → bill QR ACTIVE, bill no shown; stock of the
   three items decremented by the bought quantities.
3. Staff phone: scan bill QR → run Simulated Bag Scan (bag = billed
   items) → big green VERIFIED; bill now VERIFIED_USED.
4. Scan the SAME bill QR again → "Already Used" rejection with time.
5. New purchase; bag setup adds ONE unscanned item → Run Bag Scan →
   red MISMATCH naming the extra item; bill MISMATCH.
6. Cash: customer chooses Cash → order CASH_PENDING → staff Cash
   Confirmations → Confirm → customer bill ACTIVE with QR.
7. Dashboard on laptop: today's sales/orders increased by the demo
   amounts, stock updated, recent transactions show all three cases
   (UPI paid, cash pending→confirmed, mismatch), Impact panel moved.
8. Switch to StyleHub: scan the Steel Water Bottle barcode → Rs 549
   (not 499); cart warns/clears when switching with items.

## Device and environment matrix
- Phones: Anubhav's POCO F4 (customer) + at least two different team
  Android phones (staff + spare) — camera behaviour differs per device;
  test scanning on ALL of them, in bright and dim light, on the actual
  stage products (glossy packs are the hard case).
- Browsers: Android Chrome (primary). Also check the PWA install flow.
- Network: hostel Wi-Fi, mobile data, team hotspot; and a cold-backend
  test (let Render sleep, then open — the "waking up" state must carry
  the user, and warm-up SOP timing must be measured, not assumed).

## Edge cases that must not crash the demo
Product not found in this store; out-of-stock scan; empty cart pay
attempt (blocked); qty set above stock; switching store with a full
cart; double-tapping Pay (no double stock decrement / double bill);
scanning a bill from another store on the staff side; expired/used QR;
backend asleep; camera permission denied (manual entry path still
works end to end).

## Rehearsal protocol (Phase 5)
Full run with props, all 4 roles, timed (target ~4 minutes), twice in a
row without a reset in between (proves Reset SOP too: reset → run →
reset → run). Record one perfect run as the offline backup video.
Bug log format: step, device, what happened, screenshot — sent to the
builder the same day; fixes verified against this file's script.

# SmartScan — Design System
File 02 of 15. Visual source of truth: the attached board
"design_g_smartscan_green.png" (Design G — SmartScan Green). If this file and
the board disagree on look, the board wins; if they disagree on data/copy,
01_PRD.md wins.

## Brand
- Logo: shopping bag with a check mark inside, deep green on cream.
- Tagline: "Scan. Pay. Walk Out."
- Feel: warm retail + clean fintech. Friendly, uncluttered, NOT the generic
  purple-glow "AI app" look. No clutter, no tiny text, nothing looks
  machine-generated.

## Colour tokens (define once, as Tailwind theme / CSS variables)
- primary (deep green): #14532D — headers, primary buttons, logo.
- primary-dark (sidebar / deepest surfaces): #0C3B21.
- bg cream: #F6F2E7 (app background), card cream tint: #F6EBD7.
- surface tint (light green wash): #E8F1E4 / #EFF4E4.
- ink (main text): #16130E / #16241B. muted text: #43543F.
- success (paid / verified): #16A34A, bright accent #22C55E.
- pending (amber): text ~#8A5A12 / #B45309 on light amber background.
- alert (mismatch / errors ONLY): ~#DC2626.
- used / expired / disabled: greys.
State colour semantics are fixed: green = paid/verified, amber = pending,
red = alert only, grey = used/expired. Never use red for decoration.

## Shape and type
- Cards: 16-20px radius, soft shadow, generous padding and spacing.
- Buttons: large touch targets (min ~48px height); ONE primary action per
  screen; in customer views the SCAN action is always the most prominent.
- Type: clean sans (system / Inter-like). Headings bold, prices prominent.
- UI language: English only. (Stage narration is Hinglish; the app is not.)

## Screens (13 — details and behaviour in 10_FEATURES.md)
Customer (mobile): 1 Login (+ one-tap Demo Customer), 2 Home/Store Select,
3 Store Home (product grid + bottom cart bar), 4 Scanner, 5 Cart,
6 Payment (Mock UPI / Cash), 7 Bill/Success with big QR.
Exit Staff (mobile): 8 Verify Home (scan bill QR), 9 Verification Result
(billed checklist + Simulated RFID panel + VERIFIED/MISMATCH/USED states),
10 Cash Confirmations.
Manager (desktop): 11 Dashboard, 12 Products, 13 Settings/Demo Tools
(reset demo data).

## Copy rules
- Short, plain English labels. Bill states written as: ACTIVE, VERIFIED,
  ALREADY USED, MISMATCH, CASH PENDING.
- Mock payment screen carries small print: "Demo payment — no real money
  is charged." RFID panel is titled "Simulated RFID Bag Scan".
- Store names are fictional (FreshMart, StyleHub, DailyNeeds) with simple
  initial-based logos (FM / SH / DN). Never real brand logos.

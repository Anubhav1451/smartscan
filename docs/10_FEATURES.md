# SmartScan — Feature Specifications
File 10 of 15. Behaviour detail for every screen. Scope guard: 01_PRD.md.

## Customer app (mobile PWA)
1. Login: email + password (Supabase Auth) and a one-tap "Continue as Demo
   Customer" button. Wrong credentials → plain error, no dead ends.
2. Home / Store Select: greeting ("Hello, Anubhav!" for the demo account),
   store search, category chips (visual), store cards: initial logo (FM /
   SH / DN), name, area, "Open" state. Tapping a store enters it.
3. Store Home: product grid (name, price, stock state; out-of-stock items
   visibly greyed), product search filter, bottom cart bar appears when
   cart has items: "3 items · Rs 317 · View Cart". A small "Switch store"
   action — with items in cart it warns "Cart will be cleared" and only
   then switches (one cart = one store).
4. Scanner: live camera (ZXing), scan frame, torch toggle if supported.
   On decode: success feedback (sound/vibration if available) + product
   card added ("Milk · Rs 62 · Added"). Unknown barcode → "Product not
   found in this store" (offer: type barcode manually / go back).
   Zero stock → "Out of stock" and the item is NOT added. Manual barcode
   entry field always visible as fallback. "Done" returns to Store Home.
5. Cart: lines with qty +/- and remove; per-line totals; grand total from
   the BACKEND; stock re-check on open (if stock dropped below qty, flag
   the line). Empty cart → friendly empty state with "Start scanning".
6. Payment: order summary; method choice:
   - Mock UPI: a fake UPI sheet (app-style), 1-2s processing spinner, then
     success. Small print: "Demo payment — no real money is charged."
   - Cash: "Pay at exit counter" → order goes CASH_PENDING; screen shows
     "Show this screen at the counter. Your bill activates when staff
     confirm your cash payment." The bill view polls/refreshes status.
7. Bill / Success: big check state, "Payment Successful", LARGE QR code,
   bill no (SS-#####), store, total, item summary, status pill (ACTIVE),
   and "Show this QR at the Exit". If the bill becomes VERIFIED_USED it
   shows a grey "Verified at Exit" state; if MISMATCH, an amber "Under
   review at exit" state.

## Exit Staff app (mobile, staff login)
8. Verify Home: one huge "Scan Bill QR" button + manual bill-no entry.
   Shows the staff member's store name. Recent verifications list (last 5).
9. Verification Result: bill summary + billed items checklist. Panel
   "Simulated RFID Bag Scan": BEFORE the demo, staff can open "Bag
   contents (simulation setup)" and toggle which items are "in the bag"
   (default = billed items; the mismatch scene = add the unscanned extra
   item). "Run Bag Scan" → 1s scanning state → result:
   - Match → huge green VERIFIED screen; bill → VERIFIED_USED.
   - Extra item → huge RED MISMATCH screen naming the extra item ("1 item
     not billed: Parle-G Biscuits"); bill → MISMATCH; "Recheck" option.
   - Bill already VERIFIED_USED → grey/red "Bill Already Used" rejection
     with the original verification time.
10. Cash Confirmations: list of CASH_PENDING orders for the store
    (customer label, items, total). Confirm → bill issued (bill_no) and
    ACTIVE; the row leaves the list; customer's screen updates.

## Manager (desktop)
11. Dashboard: dark-green sidebar (Overview, Products, Orders→recent
    transactions section, Settings). KPI cards: Today's Sales, Orders,
    Digital Bills, Low-Stock Items (stock <= 5). 7-day sales bar chart.
    Top Products (by qty sold). Recent Transactions table: bill no, items
    count, amount, method (UPI / Card / Cash), status pill (Paid, Cash —
    Staff Pending, Verified, Mismatch). IMPACT panel: digital bills
    issued, estimated paper saved (bills × ~1 sheet), estimated checkout
    time saved (bills × ~3 min) — labelled "estimates from transaction
    data", never "AI".
12. Products: searchable table (name, barcode, price, stock); Add Product
    form; edit price/stock inline. Changes reflect in the customer app
    immediately (fresh fetch on Store Home open).
13. Settings / Demo Tools: store info; demo accounts list; "Reset Demo
    Data" button with a confirm dialog (restores seed — 04_DATABASE.md);
    link to run the offline backup video (demo-day SOP, not a feature).

# SmartScan — Authentication and Roles
File 11 of 15. Provider: Supabase Auth. FastAPI verifies the Supabase JWT
on every protected call and loads the caller's profile (role + store).

## Roles
- customer: own carts/orders/bills only. store_id on profile = null.
- exit_staff: bound to ONE store. Can: read that store's bills for
  verification, run exit verification, list + confirm that store's cash
  payments. Cannot: dashboard, products, other stores.
- manager: bound to ONE store. Can: dashboard summary, products CRUD,
  demo reset — for that store only.
- (No self-signup for staff/manager in the prototype: accounts are
  seeded. Customer signup may exist but the demo uses seeded accounts.)

## Seeded demo accounts (created by the seed script; simple passwords
by design — this is a stage prototype; README must say so)
- Demo Customer: demo@smartscan.app / role customer (plus the one-tap
  demo login button, which signs into this account).
- Anubhav Customer (for the Home greeting): anubhav@smartscan.app /
  customer.
- Exit Staff, FreshMart: staff@smartscan.app / exit_staff / FreshMart.
- Manager, FreshMart: manager@smartscan.app / manager / FreshMart.
Passwords: one shared demo password set at seed time, recorded in the
repo README's demo-accounts table after setup.

## Rules the backend must enforce
- A JWT with role customer cannot call /staff/*, /dashboard/*,
  /admin/* (403).
- Staff/manager store_id comes from their profile, never from the
  request body — a request naming another store is rejected.
- Bill read by a customer: only if the bill's customer_id = caller.
- Staff bill lookup by bill_no is allowed across the staff member's store
  only; a bill from another store returns "not found" (do not leak).
- Session: Supabase refresh tokens as default; demo devices stay logged
  in (long session) — stage phones are pre-logged-in per the demo plan.

## Known prototype trade-offs (write them in README, do not hide)
- Demo passwords are simple and shared with the team.
- Manual bill-no entry at exit skips the QR token check (fallback for a
  damaged camera) — production would require the signed token always.

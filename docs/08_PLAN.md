# SmartScan — Build Plan
File 08 of 15. Event: 27-28 Nov 2026. Today: 2 Nov 2026. CODE FREEZE:
20 Nov 2026 — after freeze, bug fixes and polish only, no new features.
Rhythm: every phase ends with a live demo link + screenshots → Anubhav
approves → next phase begins. Short progress note every evening.

## Phase 0 — Setup (3 Nov)
Repo created (public), 15 docs in /docs, design board in repo, project
skeleton (Vite React PWA + FastAPI), Supabase project + schema + seed
script run, accounts created with Anubhav (Supabase, Vercel, Render —
his Google login, ~15 min together). Exit check: app skeleton deploys,
seed data visible.
## Phase 1 — Design Gate (4-6 Nov)
Three screens with mocked data, pixel-close to the design board:
Home/Store Select, Store Home (grid + cart bar), Scanner UI. Exit check:
Anubhav approves the look. NOTHING else is styled before this gate passes.
## Phase 2 — Core Flow (7-12 Nov)
Login + demo login; store select; ZXing scanning + manual fallback; cart
(backend totals, stock checks); Mock UPI payment; bill QR + ACTIVE;
exit verify → VERIFIED/USED; already-used rejection. Exit check: demo
script steps 1-4 pass on a real Android phone.
## Phase 3 — Locked Extras (13-17 Nov)
StyleHub second store (same barcode, different price); cash flow end to
end; simulated RFID + MISMATCH path; dashboard (KPIs, chart, top
products, transactions, Impact panel); products add/edit; Demo Reset in
Settings. Exit check: demo script steps 5-8 pass.
## FREEZE — 20 Nov.
## Phase 4 — Testing & Hardening (18-21 Nov)
Real stage products' barcodes into seed; test matrix on team phones
(14_TESTING.md); rehearsal setup (props, devices, mirror); bug fixes
only. (Overlaps Phase 5 prep from 20 Nov.)
## Phase 5 — Rehearsal & Team Readiness (22-25 Nov)
Team teach-in session (full flow + how it works inside), role-wise Q&A
sheets, 2-3 full demo rehearsals timed, offline backup video of a perfect
run recorded (laptop + phone + pen drive).
## 26 Nov — Buffer / travel prep. 27-28 Nov — EVENT.

## Owners (see Team division, locked Group 5)
Anubhav: product owner, phase approvals, demo products/barcodes.
Leader: coordination, organisers (incl. the 8 format questions).
Member: Testing & Data. Member: Content & Presentation support.
Builder: executes phase by phase against these docs; Muse reviews every
phase output against docs + design board and owns debugging support.

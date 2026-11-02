# AGENTS.md — Permanent Build Rules for SmartScan
File 06 of 15. Save as AGENTS.md in the repo root. These rules bind every
AI agent and every human working in this repo, in every session.

- Source of truth: the 15 docs in /docs (01_PRD … 15_DEBUGGING) and the
  design board image. If code and docs disagree, docs win — flag the
  conflict, do not silently improvise.
- Stack is locked: React (Vite) + Tailwind PWA, FastAPI, Supabase
  (Postgres + Auth), ZXing JS. Do not substitute libraries or frameworks
  without reporting the exact failure and getting approval.
- The backend decides prices, totals, stock and bill status. The frontend
  never finalises a price or a payment result.
- Payment is MOCK only. RFID is SIMULATED only. Both are labelled as such
  on screen, in code comments and in README.
- Analytics are rule-based on transaction data. Never write "AI-powered"
  in the UI. AI features live only in the README roadmap section.
- Stores are fictional (FreshMart, StyleHub, DailyNeeds). No real brand
  names or logos anywhere — code, seed data, or UI.
- The customer selects the store inside the app. There is NO store-QR
  entry step. Never build one.
- Design tokens live in ONE place (Tailwind theme / CSS variables):
  primary #14532D, dark #0C3B21, cream #F6F2E7, ink #16130E,
  success #16A34A, amber pending, red alert-only. No design drift.
- UI language: English only. Mobile-first customer/staff; desktop
  dashboard.
- Secrets only in .env (never commit). .env.example lists names only.
- Work phase by phase (08_PLAN.md). Finish a phase, run it, commit with a
  clear message, update README "What works / What to test", then stop and
  wait for approval before the next phase.
- Seed/reset must restore the exact demo data in one command.
- Do not add features outside 01_PRD.md scope. Propose changes; never
  invent scope.

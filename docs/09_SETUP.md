# SmartScan — Setup Guide
File 09 of 15. Accounts are created with Anubhav's Google login in one
~15-minute sitting (Phase 0). Total cost: Rs 0 (free tiers).

## Accounts to create
1. GitHub — repo "smartscan" under Anubhav's account, PUBLIC. (Secrets
   never enter the repo; env files are gitignored.)
2. Supabase — one project (region: Singapore/Mumbai, closest available).
   Gives: Postgres DB + Auth + the two keys below.
3. Vercel — frontend hosting, connected to the GitHub repo (auto-deploy
   on push to main).
4. Render — backend web service (FastAPI), free tier, connected to the
   same repo. Note: free tier sleeps when idle (see 03_ARCHITECTURE.md).

## Environment variables (names only — values live in .env / host panels)
Frontend (.env): VITE_API_BASE_URL, VITE_SUPABASE_URL,
VITE_SUPABASE_ANON_KEY
Backend (.env): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (backend only,
never in frontend, never committed), SUPABASE_JWT_SECRET (or JWKS URL),
DATABASE_URL (if direct SQL is used), ALLOWED_ORIGINS (the Vercel URL +
localhost for dev)

## Repo layout (target)
/ (root: README.md, AGENTS.md)
  /docs (the 15 files)
  /assets (design board image)
  /frontend (Vite React PWA: src/, public/, tailwind config with the
    design tokens from 02_DESIGN.md)
  /backend (FastAPI: main.py, routers/, models/, seed.py or /scripts)
  .env.example (names only), .gitignore (.env, node_modules, __pycache__)

## Local run (for the teammate testing on a laptop)
Frontend: cd frontend; npm install; npm run dev (http://localhost:5173 —
camera works on localhost; on a phone use the deployed HTTPS link).
Backend: cd backend; python -m venv .venv; pip install -r
requirements.txt; uvicorn main:app --reload.
Seed/reset: python seed.py (or POST /admin/reset-demo as manager).

## Deploy flow
Push to main → Vercel rebuilds frontend; Render redeploys backend
(auto-deploy on). After any deploy: open the live link, run Reset Demo
Data, walk demo script steps 1-2 as a smoke test.

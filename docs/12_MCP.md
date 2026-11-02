# SmartScan — MCP and Tooling Notes
File 12 of 15. Optional tooling that helps the AI builder and the team.
Nothing here is required for the app to run; skip safely if time is short.

## What MCP is for in this project
MCP (Model Context Protocol) servers let the coding agent (e.g.
Antigravity) touch real tools — database, browser, repo — instead of
guessing. Used well, they reduce hallucinated schemas and broken deploys.

## Recommended connections
1. Supabase MCP server (official): lets the agent inspect tables, run the
   schema SQL and check seed data directly. Use the project ref of the
   SmartScan Supabase project. Prefer READ access while exploring; run
   writes (schema/seed) deliberately, in Phase 0, and re-run the reset
   script rather than hand-editing rows.
2. Browser/Chrome tooling (built into Antigravity): the agent should open
   the running app after every phase and screenshot the key screens —
   Home, Store Home, Scanner, Bill, Verification, Dashboard — and compare
   them against the design board before declaring a phase done.
3. GitHub: the agent commits per phase (AGENTS.md rule). If a GitHub MCP
   or the IDE's git integration is available, use it for status/diff
   review before each commit — never force-push; main is the demo branch.

## Safety rules (bind the agent)
- Never paste secret values (service-role key, JWT secret) into chat
  prompts or commit them; they live in .env / host secret panels only.
- MCP database access is for THIS project's database only.
- Any schema change goes through the schema file + seed/reset, not ad-hoc
  console edits, so the demo can always be restored.
- If an MCP tool is unavailable, fall back to SQL files + the Supabase
  dashboard manually — do not stall the phase on tooling.

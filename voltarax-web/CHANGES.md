# Changes in this build

> Historical notes below describe earlier versions and may not match the current implementation. For current configuration and verification see the root `docs/DEPLOY.md`, `docs/BUILD_PLAN.md`, and the actual source.

## Chatbot (React/TypeScript + Node/Express, adapted from the Polaris chat widget pattern)
- `frontend/components/chat/ChatWidget.tsx` — floating button + chat panel, typing indicator, quick-reply chips, voice input. Mounted once in `app/layout.tsx`.
  - public pages: answers via `POST {NEXT_PUBLIC_API_URL}/api/chat`
  - `/dashboard/*`: also fetches live numbers from VoltVision with the signed-in user's token
  - hidden on `/login`; history is in memory only
- `frontend/lib/chatLive.ts` — pure intent detection + formatters for forecast / carbon / alerts / coating health / panels
- `backend/routes/chat.js` + `backend/data/publicKnowledge.js` — public-safe FAQ, input validation (max 500 chars), 20 msgs/min rate limit.
  Optional LLM fallback if `external LLM key (not required)` is set (system prompt restricted to the public facts; refuses pricing/IP/infra questions).

## Landing page
- `components/landing/HeroSection.tsx` (typewriter hook rewritten — old one had a stale-closure timer) and
  `components/landing/LandingSections.tsx`: Why it matters, Coating, 8 AI capabilities, How it works, Applications, Team, CTA. `app/page.tsx` composes them.

## Errors fixed
- `/dashboard/users` and `/dashboard/settings` were one file exporting non-default components -> invalid pages. Split into two valid pages.
- `/dashboard/forecast` exported a named component only -> now default export.
- 13 TypeScript errors: `Authorization` header typing across dashboard pages.
- `CustomCursor.tsx`: a local `ring` variable shadowed the ref (6 TS errors).
- `/contact`: `useSearchParams()` without `<Suspense>` broke `next build`.
- `themeColor` moved from `metadata` to `viewport` (Next 14 warning on every route).
- ESLint `react/no-unescaped-entities` was failing the build -> disabled (apostrophes are valid in JSX text).
- Footer linked to non-existent `/privacy`, `/terms`, `/careers`, `/docs`, `/blog`, `/press` routes -> removed.

## Removed (was public in the shipped bundle)
- Demo credentials (3 accounts) on the login page; default admin password in `seed.js`, `.env.example`.
- Pending-patent claim text, patent numbers, model names/metrics, coating recipe/ratio, hardware list, stack list, roadmap/milestone detail.
- Hard-coded production hostname, GitHub repo link, API-docs links, contact email/phone (now `NEXT_PUBLIC_CONTACT_EMAIL` / `NEXT_PUBLIC_CONTACT_PHONE`).
- Seed script no longer prints the admin password and no longer inserts made-up blog posts.

## Setup
    cd backend  && cp .env.example .env   # set MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
    npm i && npm run seed && npm start
    cd frontend && cp .env.local.example .env.local && npm i && npm run dev

## Dashboard navigation/API repair — 2026-09-28

- Repaired dashboard API architecture: all dashboard/login/contact requests now use same-origin `/api/*` paths.
- Added `frontend/next.config.js` rewrites to the local Node/Express backend via `BACKEND_URL` (default `http://127.0.0.1:5000`).
- Removed remaining dashboard dependence on the old Render/VoltVision API host.
- Fixed Forecast hourly response handling and time labels.
- Fixed CV summary response mapping and BFCI SHAP response shape.
- Fixed Carbon monthly response handling.
- Fixed Users page field mapping (`name`, `lastLogin`).
- Added dashboard `error.tsx` and `loading.tsx` so a single broken section cannot make the navigation feel dead.
- Hardened dashboard session JSON parsing.
- Added `BACKEND_URL` to the frontend environment example.

## Firebase migration — verified and fixed — 2026-09-29

Ran the full backend against a real Firebase Admin SDK code path (Google's own network
calls faked; every line of this app's routes/models/services executed for real) and found
and fixed:

- **Hardware → dashboard gap**: the NodeMCU's primary path (writing straight to Firebase,
  bypassing this server entirely) never triggered `/solar_site/analysis`, since that was only
  computed inside the optional `/api/telemetry/ingest` bridge. Added
  `backend/services/telemetryWatcher.js`, a single Firebase listener on `/solar_site/latest`
  that recomputes analysis on *any* change, whichever path wrote it. Without this fix, a
  NodeMCU wired exactly per `hardware/README.md` would never show health/alerts on the
  dashboard.
- **Crash on every telemetry write**: `SolarAnalysis.findOneAndUpdate(...).lean()` — `.lean()`
  was called on a Promise (the method is already `async`), throwing `TypeError: ...lean is not
  a function` on every single ingest and on every watcher tick.
- **Login always failed** (`user.comparePassword is not a function`): `User.findOne` /
  `findById` routed through the shared `FirebaseQuery.exec()`, which JSON-clones rows for
  plain-object models — silently stripping the `UserRecord` class methods
  (`comparePassword`, `save`, `toJSON`) it needs. Rewrote both to keep the `UserRecord`
  instance intact. This also means `GET /api/auth/me` was returning the hashed password in
  the response (its safety net was `toJSON()`, which the bug above had already stripped).
- **Startup crash was a raw SDK stack trace**: `config/firebase.js` now fails with a specific,
  actionable message (which env var is missing and where to find it in the Firebase console)
  instead of `FirebaseError: Can't determine Firebase Database URL` with no context.
- **Silent 500s**: `POST /api/auth/login` and `/register` now log the real error server-side
  (`console.error`) before returning the generic client-facing message — the bug above was
  invisible without this.
- **Chatbot**: trimmed `backend/data/publicKnowledge.js` to the exact 3 questions the on-site
  widget asks (was still carrying 11 entries and a dead LLM system-prompt from an earlier
  version); removed the now-unused `frontend/lib/chatLive.ts`.

All 21 checks (auth, RBAC, direct-hardware-write → analysis, bridge ingest, dashboard/panels/
forecast/carbon, content routes, chat) pass. `tsc --noEmit` and `next build` are clean.
Not tested against your actual Firebase project or real hardware — I don't have those
credentials; see "Go live" below for what to paste in.

## AI engine + photo/logo slots + background video — 2026-09-30

### New: `ai-engine/` — separate Python project
Structured-data pipeline that trains on Firebase telemetry history and
publishes predictions back to Firebase for the dashboard to read. Not yet
connected to real hardware, but the automation is real and tested:

- `data/schema.py` + `data/ingest.py`: canonical structured reading format,
  shared by hardware, the Node ingest bridge, and this engine.
- Three models: `forecast_gbr` (Gradient Boosting power regression —
  research-grounded choice, see `ai-engine/README.md`), `anomaly_isolation_forest`
  (formalizes `hardware/raspberry-pi/train_model.py` and — new — publishes
  to the *web* dashboard too, not just the local Pi touchscreen), and
  `health_baseline` (replaces the guide's manually-eyeballed `BASELINE_PR`
  constant with a value computed from the panel's own recent good days).
- `pipeline/orchestrator.py`: the automation loop — checks data volume,
  trains what's ready, predicts from the latest reading, publishes to
  `/solar_site/ai/*`. Runs on a schedule (`scripts/schedule_cron.md`);
  needs zero changes when hardware goes live — it already retrains the
  moment enough real rows exist, same script, same schedule.
- `tests/test_pipeline_synthetic.py`: 8 tests, all passing, proving the
  above with synthetic telemetry — no real Firebase or hardware needed.
  Caught and fixed a real retrain-gating bug in the process (it was
  comparing a filtered row count against an unfiltered one, so the "wait
  for N new rows" check never actually gated anything).
- Node side: `backend/services/aiPredictions.js` reads `/solar_site/ai/*`;
  `GET /api/forecast` now prefers the AI engine's prediction over the
  existing rule-based baseline once one exists, `GET /api/alerts` surfaces
  a real detected anomaly, and a new `GET /api/ai/status` exposes all three
  model outputs together. Tested end-to-end (Python → Firebase shape →
  Node route) against the same mock Firebase Admin SDK used earlier in
  this project — 24/24 checks pass.

### Team, incubation partner and client photos
No real photos were fabricated — `components/ui/AvatarImage.tsx` and
`LogoBadge.tsx` show a real file when present and fall back to the
existing initial-badge / text-wordmark automatically when it isn't. Added:
`public/team/` (6 filenames wired up, see its README.md), `public/partners/`
(IIT incubation logo), `public/clients/` (DTU, ITC Hotels — a new
"Institutions & Clients" section on the About page, with an "Others coming
soon" placeholder for more).

### Background
`components/ui/SiteBackgroundVideo.tsx`: site-wide, sits behind everything
(including the existing particle background), with a dark translucent
overlay for text contrast. No video ships with the repo — add
`public/media/renewable-bg.mp4` (see its README.md for free sources);
until then it falls back to the existing plain dark background, no broken
video icon. Respects `prefers-reduced-motion`.

## Project reference PDF — 2026-10-07
Added `docs/Voltarax_Project_Reference.pdf`: a 9-page internal reference covering what is
complete, what remains, the multi-site (Mumbai/Delhi/Haryana/Kashmir) monitoring plan, team, IP
status, institutional partners, and the DTU-IIF -> DPIIT -> SIPP -> NIDHI-PRAYAS/SISFS ->
investor roadmap. Internal only — it names unfiled patent claims, so do not publish it or
serve it from the website. Also corrected the README project tree, which was missing `ai-engine/`.

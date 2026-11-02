# Voltarax frontend

Existing Next.js application, maintained in place. Node 24 is locally tested.

Copy `.env.example` to an ignored `.env.local`. `BACKEND_URL` is the server-side API proxy target compiled at build time; rebuild after changing it. Never put secrets in `NEXT_PUBLIC_` variables. Start the separately configured API, then run `npm ci` and `npm run dev -- --hostname localhost` here. Production checks are `npm run lint`, `npx tsc --noEmit` and `npm run build`. The build's Node postbuild script stages public/static assets without deleting output; `npm start` runs the standalone server. Set HOSTNAME=localhost and PORT explicitly for a local-only check; the container uses 0.0.0.0:3000.

Sign-in and registration use the same-origin `/api` proxy and an httpOnly session cookie. No browser token is stored in localStorage. Email verification requires configured, deliberately enabled SMTP on the backend; new viewers need a site assignment. Account settings support OTP-confirmed password changes, and administrators can assign roles/sites on the Users screen.

Dashboard values carry quality labels. Unconnected services show Unavailable/Coming soon. Synthetic fixtures belong only in tests or the named device simulator. See `../../docs/PROGRESS.md` for verified work and `../../docs/MANUAL_STEPS.md` for service, hardware and launch checks still needed.

The administrator Devices screen shows new/rotated keys once and confirms sensitive changes by OTP. Relay controls separately show requested output, acknowledgement and unavailable physical contact state. The panel grid uses configured virtual allocation positions with Estimated power; it is empty when the installation count is unknown. The overview discloses recorded-energy coverage. Guarded simulator mode shows Test data and Estimated values.

This memory-limited workspace uses one Next build worker. From the workspace, run slow checks through `tools/run-check.py --cwd voltarax-web/frontend --name CHECK_NAME -- COMMAND`; a command-local 768 MB Node heap was sufficient. Keep heavy SQL/AI/build/emulator/browser jobs sequential. No system-wide setting change is needed.

Alerts and Work Orders now use saved site-scoped records, status/history and operator controls. Work-order edits include a version so a stale screen cannot overwrite a newer edit. Carbon Analytics includes authenticated report evidence/PDF downloads and operator generation with coverage/factor checks. These features require the backend's separately configured relational storage; missing storage is shown as Unavailable. No real database, queue, SMTP or real-data report is verified by the frontend build.

Camera/Coating inspections use protected saved photos and manual observations. Camera URLs/credentials stay on the server. Operator input is dated in IST; rules are categorical and visible, with stale status and observation trends. No automatic defect classification, numerical coating score or physical capture timestamp is invented. Native image elements intentionally bypass public image optimization so browser session cookies reach the authorized same-origin routes. Actual camera/browser workflow verification remains manual/E2E work.

The bilingual UI uses unchanged English paths and /hi paths. Public indexing is off until reviewed HTTPS origin/content flags match at build and runtime. Legal pages remain noindex drafts. Source-bound messages do not translate entered names/notes/IDs; fluent/AT review and English-only PDF/mail limits remain explicit. The authenticated state map joins only the configured site, with table/missing-boundary fallback; see MAP_DATA.md before installing any geometry.

GET /healthz checks this process only; /health proxies API liveness and /api/ready checks configured API dependencies. Multi-stage packaging/Compose/Coolify/backup/rollback steps and actual verification limits are in RELEASE_OPERATIONS.md. Docker runtime and external services were not verified here. Final test evidence/status is in FINAL_REPORT.md and PROGRESS.md.

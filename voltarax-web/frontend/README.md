# Voltarax frontend

Existing Next.js application, maintained in place. Node 24 is locally tested.

Copy `.env.example` to an ignored `.env.local`. `BACKEND_URL` is the server-side API proxy target; do not put secrets in `NEXT_PUBLIC_` variables. Start the separately configured API, then run `npm ci` and `npm run dev` here. Production checks are `npm run lint`, `npx tsc --noEmit` and `npm run build`.

Sign-in and registration use the same-origin `/api` proxy and an httpOnly session cookie. No browser token is stored in localStorage. Email verification requires configured, deliberately enabled SMTP on the backend; new viewers need a site assignment. Account settings support OTP-confirmed password changes, and administrators can assign roles/sites on the Users screen.

Dashboard values carry quality labels. Unconnected services show Unavailable/Coming soon. Synthetic fixtures belong only in tests or the named device simulator. See `../../docs/PROGRESS.md` for verified work and `../../docs/MANUAL_STEPS.md` for service, hardware and launch checks still needed.

The administrator Devices screen shows new/rotated keys once and confirms sensitive changes by OTP. Relay controls separately show requested output, acknowledgement and unavailable physical contact state. The panel grid uses configured virtual allocation positions with Estimated power; it is empty when the installation count is unknown. The overview discloses recorded-energy coverage. Guarded simulator mode shows Test data and Estimated values.

This memory-limited workspace uses one Next build worker. Run slow checks with `../../tools/run-check.py` from the workspace as documented; a terminal-only 768 MB Node heap was sufficient for a local production build. No change to system-wide settings is needed.

Alerts and Work Orders now use saved site-scoped records, status/history and operator controls. Work-order edits include a version so a stale screen cannot overwrite a newer edit. Carbon Analytics includes authenticated report evidence/PDF downloads and operator generation with coverage/factor checks. These features require the backend's separately configured relational storage; missing storage is shown as Unavailable. No real database, queue, SMTP or real-data report is verified by the frontend build.

Camera/Coating inspections use protected saved photos and manual observations. Camera URLs/credentials stay on the server. Operator input is dated in IST; rules are categorical and visible, with stale status and observation trends. No automatic defect classification, numerical coating score or physical capture timestamp is invented. Native image elements intentionally bypass public image optimization so browser session cookies reach the authorized same-origin routes. Actual camera/browser workflow verification remains manual/E2E work.

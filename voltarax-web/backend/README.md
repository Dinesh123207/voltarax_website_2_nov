# Voltarax API

Express API with Firebase RTDB telemetry/accounts and optional PostgreSQL operations persistence. Run commands in this directory using Node 24 (the locally tested version; native TypeScript loads the Drizzle schema).

- Copy `.env.example` to an ignored `.env` and configure Firebase service-account values, database URL and a random JWT secret. Production startup refuses the example secret.
- `npm ci`, then `npm run dev` for local work or `npm start` for the configured server. These connect to the configured Firebase project; tests below do not.
- `npm test` runs isolated Node tests with fake repositories/senders. `npm run test:rules` (when installed) runs only a localhost demo Firebase emulator.
- Production installs use `npm ci --omit=dev`. `python ../../tools/audit-dependencies.py` checks both service production trees.

Registration uses email OTP and creates an unverified viewer. Email sending is disabled by default; configure SMTP and deliberately enable it before using registration. Existing accounts must verify. An administrator assigns sites. Browser sessions use cookies through the frontend proxy; native clients explicitly request a bearer token. Sign-out revokes all devices.

`npm run seed` is a guarded one-time administrator bootstrap, never sample content. Review the exact setup and recovery steps in `../../docs/MANUAL_STEPS.md` before running it. It was not run on a live project.

See `../../docs/API.md`, `SECURITY_CHECKLIST.md`, `DEPLOY.md` and `KNOWN_ISSUES.md` for route contracts, trust boundaries and remaining checks. The Admin SDK bypasses Firebase rules, so API authorization is essential. Physical devices, live SMTP, real Firebase deployment and production proxy behavior require operator verification.

Registered devices authenticate with hashed per-device keys. Administrator OTP actions register, rotate and disable keys; keys are shown once. Relay commands default disabled, expire in thirty seconds and require a device acknowledgement; physical contact state remains unavailable without a sensor. See `../../tools/device-simulator/README.md` for the guarded loopback-only demo. `npm run test:device-emulator` uses a cached official local emulator and fake mail, not live credentials.

Conditional Firebase transactions use the shared cache-warming adapter, verified through the real local SDK. Recorded energy totals disclose interval coverage and remain null without valid intervals. Panel allocation is virtual and requires an explicit verified installation count; it does not measure individual panel health.

Persistent alerts, work orders, audit and ESG report snapshots require a configured/migrated DATABASE_URL. Runtime never migrates automatically. Review generated SQL, back up, then use the explicit guarded npm run db:migrate workflow in MANUAL_STEPS.md. scripts/import-audit.js validates local legacy exports by default without database access. PGlite tests exercise actual SQL when Docker is unavailable; they do not verify a running PostgreSQL/Redis service.

Notifications are disabled by default and require a separate switch, reviewed recipients, Redis and TLS SMTP. BullMQ retries up to five times and retains terminal failures; email is at-least-once. Reports require sufficiently covered real primary-device data and a verified explicit carbon factor/source. Synthetic/demo issuance is refused. The saved test PDF is a labelled fixture only. See DEPLOY.md for pgBackRest/Firebase backup/restore drills that still require actual services.

Camera access is separately disabled by default and uses fixed backend-only URLs/credentials. Authenticated site members read a bounded proxy stream or protected sanitized photos; only operator/admin can capture/upload/save observations. JPEG/PNG processing is capped in worker threads, strips metadata and stores server receipt time separately from user-reported observation time. Photo/observation records require the new reviewed migrations; category rules/trends do not claim an ML diagnosis or coating score. See API.md/MANUAL_STEPS.md for actual hardware and upload checks still needed.

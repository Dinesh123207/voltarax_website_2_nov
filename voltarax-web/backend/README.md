# Voltarax API

Express API with Firebase RTDB persistence. Run commands in this directory using Node 24 (the locally tested version).

- Copy `.env.example` to an ignored `.env` and configure Firebase service-account values, database URL and a random JWT secret. Production startup refuses the example secret.
- `npm ci`, then `npm run dev` for local work or `npm start` for the configured server. These connect to the configured Firebase project; tests below do not.
- `npm test` runs isolated Node tests with fake repositories/senders. `npm run test:rules` (when installed) runs only a localhost demo Firebase emulator.
- Production installs use `npm ci --omit=dev`. `python ../../tools/audit-dependencies.py` checks both service production trees.

Registration uses email OTP and creates an unverified viewer. Email sending is disabled by default; configure SMTP and deliberately enable it before using registration. Existing accounts must verify. An administrator assigns sites. Browser sessions use cookies through the frontend proxy; native clients explicitly request a bearer token. Sign-out revokes all devices.

`npm run seed` is a guarded one-time administrator bootstrap, never sample content. Review the exact setup and recovery steps in `../../docs/MANUAL_STEPS.md` before running it. It was not run on a live project.

See `../../docs/API.md`, `SECURITY_CHECKLIST.md`, `DEPLOY.md` and `KNOWN_ISSUES.md` for route contracts, trust boundaries and remaining checks. The Admin SDK bypasses Firebase rules, so API authorization is essential. Physical devices, live SMTP, real Firebase deployment and production proxy behavior require operator verification.

# Voltarax

Existing Next.js website/dashboard, Express API, Firebase telemetry/accounts, optional PostgreSQL/Redis operations, Python AI engine and hardware firmware.

Start with the [documentation index](../docs/README.md) and practical [verification and running guide](../docs/VERIFICATION_AND_RUN_GUIDE.md) (and its accompanying PDF). Current evidence is in `../docs/PROGRESS.md`; external requirements are in `../docs/MANUAL_STEPS.md`. Historical phase tags describe their original checkpoints.

## What runs where

- `frontend/`: Next.js public English/Hindi pages and authenticated dashboard, normally port 3000.
- `backend/`: Express API, normally port 5000; Firebase RTDB is required for connected accounts/telemetry. PostgreSQL enables saved operations, inspections and commerce; Redis enables shared limits/queues.
- `ai-engine/`: separate Python batch inference/training. It is optional and does not start with the website.
- `hardware/`: NodeMCU telemetry/relay, ESP32 camera and Raspberry Pi integration. Hardware is optional for public pages and local synthetic checks.

Browser requests use the frontend's same-origin `/api` proxy. `BACKEND_URL` is server-side and compiled at build time; rebuild after changing it. There is no automatic cloud hosting, default account or sample price.

## Public-page preview only

Use the locked Node version from the service packages (24.19.0 was tested). In PowerShell:

```powershell
Set-Location C:/Users/JARVIS/Desktop/VOLTARAX/voltarax-web/frontend
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev -- --hostname localhost
```

Open http://localhost:3000 or http://localhost:3000/hi. Stop with Ctrl+C. This previews public pages; accounts/dashboard require the separately configured API. Existing private configuration files are preserved.

## Connected development system

Review the running guide first. Choose an isolated test Firebase project; configure the backend's ignored `.env`, strong independent JWT/OTP secrets, exact local frontend origin and intended site/device. For local HTTP development set `NODE_ENV=development`; production cookies require the intended HTTPS/proxy environment. The current API listener accepts network interfaces, so restrict local port 5000 with the host firewall or an isolated development network.

Run `npm ci`, then `npm run dev` from `backend/` in one terminal; run the frontend command above in a second. These start real configured services, unlike the isolated tests. SMTP is off by default: interactive verification needs deliberately configured test delivery. New users require email verification and site access.

`npm run seed` is a guarded, one-time first-administrator operation against the configured Firebase project. It is not a normal startup step. Review the target, bootstrap flag and private values in MANUAL_STEPS.md; disable bootstrap and remove its password immediately afterward. Do not run it on every start.

Optional SQL features require an explicitly reviewed migration against a backed-up test database. Runtime never applies migrations automatically. The private Docker Compose path and exact settings are in `../docs/RELEASE_OPERATIONS.md`; image runtime/hosted deployment must be verified separately.

## Local checks

From the workspace root:

```powershell
python tools/run-check.py --cwd voltarax-web/backend --name local-backend -- npm test
python tools/run-check.py --cwd voltarax-web/frontend --name local-lint -- npm run lint
python tools/run-check.py --cwd voltarax-web/frontend --name local-types -- npx tsc --noEmit --project tsconfig.source.json
```

The wrapper records output and limits each command to ten minutes. The running guide also covers production build, owned browser/emulator checks, AI, native helpers and firmware. Keep heavy checks sequential on this 4 GB host. Tests use synthetic fixtures; they do not establish actual service, sensor or model accuracy.

## Product limits

Values remain Measured, Estimated, Calculated or Unavailable. Missing services/data must not become invented totals. Relay acknowledgements do not prove physical contact state. AI estimates current conditions; weather-ahead forecasting is unfinished. Payments stay test-only/off/unpriced by default. Map geometry needs approved licensed inputs. Legal pages are drafts and public indexing is off.

Consult each service README and `../docs/KNOWN_ISSUES.md` for current scope. Do not publish private material, deploy, send real mail or activate payments as part of an ordinary local preview.

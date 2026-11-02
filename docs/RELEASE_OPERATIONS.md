# Release operation guide

This guide describes an operator-run **non-production** installation. No image build, container startup, hosted CI, Coolify action, DNS/TLS change, real message/payment or backup/restore was performed. The Docker CLI could parse the full Compose file, but its local engine is unavailable. Complete the manual checks below before relying on this packaging.

## Local stack

Use the existing `voltarax-web` directory. Copy its `.env.example` to an ignored `.env`, then supply private values there. The root example is for Compose interpolation; descriptions/default policies remain in each service's own example. No ignored service environment file is required by Compose. Backend and AI credentials are separate: AI uses the `AI_FIREBASE_*` root inputs. Do not print resolved Compose configuration; `config --quiet` validates without disclosing values.

1. Select an isolated test Firebase project; configure backend Firebase credentials, strong independent JWT/OTP secrets, actual site/device identity and explicit unknown installation values. No default user or product/price is created.
2. Supply independent PostgreSQL/Redis passwords and URL-encoded `DATABASE_URL`/`REDIS_URL` with internal hosts `postgres:5432`/`redis:6379`. Preserve named volumes. Keep SMTP, notifications, camera, payments and AI network/publication switches false until their separately reviewed test integrations are intended.
3. With an available Docker engine, validate using `docker compose --profile ai config --quiet`, then build with `docker compose build`. These are still unverified here. Image references/digests were checked at the official registry; rebuild/test before updating them.
4. Start only storage with `docker compose up -d postgres redis`. Review/back up the intended empty test database, then explicitly run `docker compose run --rm --no-deps -e ALLOW_RELATIONAL_MIGRATIONS=true backend npm run db:migrate`. Runtime never applies migrations. Never point this procedure at an unreviewed/live database.
5. Start `docker compose up -d backend frontend`. Only frontend `127.0.0.1:3000` and local storage administration ports are published; the API stays internal. Secure cookies need the reviewed HTTPS origin/proxy path; verify intended local browser behavior rather than disabling cookie security. Do not expose database/Redis ports publicly.
6. Inspect health and safe logs. Frontend `/healthz` is liveness; backend `/health` is API liveness. Backend `/ready`, also proxied through `/api/ready`, probes Firebase and configured SQL/Redis dependencies with a two-second response ceiling, shared in-flight work and five-second cache. Empty telemetry is permitted; readiness does not establish sensor freshness, SMTP, payment, map approval or field accuracy. Unavailable dependencies/schema return 503 with no private details.
7. The optional `ai` profile is a batch image, not a web service. Its default command performs current-input inference once and exits; it has no invented health endpoint. Keep both remote/publication flags off until reviewed real-data checks. Use the existing scheduling guide for minute inference/hourly drift and bounded training. Persist `/srv/artifacts`, restrict its owner and trust only reviewed versioned artifacts.

All runtime application images use non-root users. Backend installs production dependencies only and excludes tests, fixture control endpoints, credentials and raw boundary files. Frontend uses the traced standalone server plus explicit static/public assets and retained notices. The Compose filesystem is read-only except temporary/cache paths and named storage. Verify those paths, image processing and cache behavior on the actual container host; syntax checking cannot establish runtime permissions.

## Coolify settings

The chosen path is a Git-based Compose application after the owner separately authorizes repository transfer/deployment. It keeps the API/storage on one private service network and uses explicit environment mappings, avoiding missing private env files in a Git checkout. Current platform instructions: [Compose application](https://coolify.io/docs/applications/builds/docker-compose), [environment scopes](https://coolify.io/docs/applications/configuration/environment-variables), [proxy](https://coolify.io/docs/core/networking/proxy/overview). Platform UI labels may change; verify the intended resource before saving.

| Setting | Intended value/action |
| --- | --- |
| Server/project/environment | Owner-selected non-production server and environment; no new paid resource is assumed |
| Source | Owner-authorized private repository connection with read access; no source was uploaded here |
| Branch | `phase-10-release`; disable automatic deploy/webhook/preview deployment and verify the recorded candidate commit before a manual rollout |
| Build strategy | Compose |
| Base Directory | `/voltarax-web` |
| Docker Compose Location | `/docker-compose.yml`, relative to that base |
| Compose deployment | Normal managed mode; do not select Raw because proxy labels are not supplied manually |
| Build arguments | Managed manually in Dockerfile; use declared frontend ARGs, never credential build arguments |
| Build/start commands | Keep default Compose behavior; no custom commands needed |
| Public service | Only `frontend`, internal port 3000, process on `0.0.0.0`; backend/PostgreSQL/Redis/AI get no public domain |
| Domains | Reviewed HTTPS test hostname with internal port suffix `:3000` in the service domain setting; the public HTTPS port remains 443 |
| Origin | Set `FRONTEND_URL` to the actual HTTPS origin without the internal port suffix; it supplies the backend CORS allowlist |
| Health | Retain the Dockerfile/storage healthchecks: frontend `/healthz`, backend `/ready`, SQL/Redis native probes. Investigate 503; do not replace it with a forced healthy response |
| Persistent storage | Preserve `postgres_data`, `redis_data`, and, if used, `ai_artifacts`; map an approved boundary file read-only to `/srv/data/india-states.geojson` only after MAP_DATA.md review |
| Environment values | Enter root `.env.example` mappings in the UI. Keep credentials runtime-only and hidden/locked. Public metadata flags are build and runtime; `NEXT_PUBLIC_*` are reviewed public build inputs only |
| Integration switches | False by default; `PAYMENTS_MODE=test` and GST unavailable remain enforced. There is no supported live-payment switch |
| Resource limits | Measure build/runtime requirements on the intended server; one build worker and 768 MiB Node build heap are configured. No service capacity/SLA is claimed |
| Logs/alerts | Keep environment-value redaction enabled; use safe request IDs and reviewed restricted log retention/recipients |

Configure owner-approved PostgreSQL/Redis secrets and backend/AI credentials in their runtime scopes. Rebuild whenever the backend proxy target, public client values or static metadata origin changes. `BACKEND_URL` is compiled as `http://backend:5000` for this stack and must resolve privately; never use the public frontend origin as its own API target. Maintain the same reviewed metadata flags at build and runtime. Keep indexing off while facts/legal review are incomplete.

Before deployment, create the reviewed SQL schema as a separate guarded operation against the selected test database. Then perform the manual rollout and inspect the exact deployed source digest, healthy services and origin behavior. This guide does not claim that Coolify is installed, that its resource was created, or that the containers work on that server.

## Configuration table

The root and service `.env.example` files are the complete variable inventories; this table states scope and activation policy rather than exposing values.

| Group | Scope | Required inputs/policy |
| --- | --- | --- |
| `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `DATABASE_URL`, `REDIS_URL` | Private Compose/runtime | Independent secrets, URL encoding, private service DNS; TLS with verified CA when crossing a trusted host boundary |
| `FIREBASE_PROJECT_ID`, `FIREBASE_DATABASE_URL`, account JSON or client-email/private-key pair | Backend runtime only | Deliberately selected test project and least privilege; never browser/build inputs |
| `JWT_SECRET`, `OTP_SECRET`, `SESSION_TTL_SECONDS` | Backend runtime | Strong independent secrets, existing lifetime bounds; no bootstrap password |
| `SOLAR_SITE_ID`, `SOLAR_DEVICE_ID`, panel/spec/freshness/factor settings | Backend/AI runtime | Verified identity/physical assumptions and explicit missing counts; no fabricated business facts |
| `FRONTEND_URL`, `CORS_ORIGINS`, proxy-hop settings | Runtime | Exact intended HTTPS origin and verified proxy chain; the stack derives CORS from its frontend origin |
| `EMAIL_ENABLED`, SMTP variables, notifications/recipients | Backend runtime | Off by default; real delivery was not tested or authorized here |
| `PAYMENTS_ENABLED`, test key/webhook fields | Backend runtime | Off by default, test keys only, prices unset; GST/live mode are unsupported |
| `CAMERA_*`, relay enablement/device permissions | Backend runtime | Off/guarded until actual private camera and safe hardware verification |
| `MAP_*` | Backend runtime + approved read-only data mount | Hash, property schema, attribution, state assignment and actual rights/outline review; missing by default |
| `AI_FIREBASE_*`, `AI_*` and shared physical identity | AI runtime only | Separate least privilege; remote/publication off, chronological real-data validation and trusted artifact storage |
| `SITE_URL`, public indexing/content-review flags | Frontend build and runtime | Blank/off until owner/counsel/content/domain review |
| `NEXT_PUBLIC_*` | Frontend build only | Reviewed public contact/social values or explicit optional video flag; never secrets |

## DNS, TLS, rollout and rollback

The owner must supply a hostname, DNS control and publication authorization. Point its A/AAAA records to the intended test server, keep administrative/storage access private, enable the chosen Coolify proxy's HTTPS certificate flow and confirm hostname/chain/renewal and HTTP-to-HTTPS behavior. Do not invent a legal domain or activate search indexing as part of connectivity testing.

Record candidate commit and built image digests, private environment version and database migration state before rollout. Back up first and check the new deployment's readiness, real cookie flags, site denial, OTP test delivery and guarded test-order webhook flow on the intended HTTPS hostname. Preserve the previous known image. Roll back the application image/configuration only when schema-compatible; destructive automatic down-migrations and live restore are not provided. Use a separately approved recovery plan if data changes need restoration. Re-run readiness and authenticated checks after rollback.

## Backups and monitoring

Follow the concrete pgBackRest/Firebase export and isolated restore steps in DEPLOY.md; none ran here. The operator must choose retention, encryption, recovery objectives and approved off-host storage. Preserve Firebase identities/claims and private configuration separately. Test restoration into a new empty isolated environment before accepting any recovery claim.

Monitor frontend liveness, backend readiness through the same-origin proxy, protected telemetry freshness/last-seen, AI input/model/publication clocks, queue dead letters, failed webhook deliveries, SQL/Redis storage and backup age. Readiness alone is not evidence of operating hardware or complete business features. Establish actual alert routing and incident ownership with approved recipients; this run did not send monitoring messages or enable schedules. Record an observed non-production failure/recovery and restore drill, then review thresholds/capacity. No uptime percentage, recovery time or operational certification is claimed.

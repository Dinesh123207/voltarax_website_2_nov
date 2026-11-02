# Security checklist

## Phase 7 commerce routes

All parameters/query/body use strict Zod schemas (provider webhook envelopes permit ignored provider fields only after raw HMAC). Cookie writes require the request header; server role/owner checks are independent of UI. Actual HTTP/PGlite tests cover public/401/403/owner-vs-other/admin, rejected client amount, invalid raw signature before SQL, replay and protected invoice downloads.

| Route under /api/commerce | Method | Authorization |
| --- | --- | --- |
| /plans | GET | Public active plans only |
| /orders | GET, POST | Verified active account; own records, server prices |
| /orders/:id | GET | Owner or admin |
| /orders/:id/verify | POST | Owner; server-stored order HMAC, no paid transition |
| /orders/:id/invoice, /orders/:id/invoice.pdf | GET | Owner/admin; confirmed captured payment |
| /admin/plans, /admin/plans/:id | GET/POST, PATCH | Admin; plan version check |
| /admin/orders | GET | Admin |
| /admin/orders/:id/reconcile | POST | Admin and explicit confirmation; matching test receipt |
| /admin/orders/:id/refunds, /:refundId | POST, PATCH | Admin and explicit confirmation; no gateway refund API |
| /webhook | POST | Raw HMAC before SQL; digest/event dedup, financial checks |

## Baseline scan

- A local filename and text-pattern scan found no `.env` secret files, firmware `secrets.h`, service-account key files, PEM/key/PKCS files, or common cloud/API token patterns outside examples. The backend example contains a private-key placeholder, not a real key. This limited scan is not proof that all secrets are absent.
- Before sharing any real Firebase service-account credentials, device passwords, Wi-Fi credentials, API keys, JWT secrets, SMTP credentials, or firmware `secrets.h`, keep them out of Git. **Must be rotated if ever shared** or exposed in Git history.
- Check actual local configuration and any external repositories separately before deployment or sharing. Never paste real values into logs or issue reports.

## Route access inventory (updated Phase 5)

The dashboard router is mounted both at `/api` and `/api/voltvision`; entries below apply to both prefixes. The public health check is `/health`.

| Methods and routes | Authentication | Role / notes |
| --- | --- | --- |
| GET `/health` | None | Public process health only. |
| POST `/api/auth/register`, `/api/auth/login`, `/api/auth/otp/request`, `/api/auth/otp/verify` | Password + OTP before account access | Viewer registration; Zod, IP/email limits, six-digit single-use OTP, no token before verification. |
| GET `/api/auth/me`; POST `/api/auth/logout` | Verified, active JWT session | Cookie or native bearer; audience/issuer/version. Logout revokes every device. |
| POST `/api/auth/sensitive/request`, `/api/auth/password` | Verified JWT + action/target-bound OTP | Own password; user-access codes require admin. |
| PATCH `/api/auth/users/:id/access`; GET `/api/auth/audit` | Verified JWT | Admin only; access changes require OTP and log attempt/applied events. No self access mutation. |
| POST `/api/contact`, `/api/demo`, `/api/subscribe`, `/api/chat` | None | Public form/FAQ by design; Zod, bounded inputs, endpoint throttling. |
| GET `/api/posts`, `/api/posts/:slug` | None | Published content only. |
| GET `/api/admin/contacts`, `/api/admin/demos`, `/api/admin/stats` | JWT | Admin. |
| POST `/api/telemetry/ingest` | Registered device ID/key | Hashed key, disabled-device rejection, identity binding, timestamp bounds, replay checks. Legacy shared key requires an explicit migration flag and is pinned to configured primary identity. |
| GET `/api/devices`, `/api/devices/:id/history` | Verified JWT | Administrator only; bounded metadata/history, no keys or hashes returned. |
| POST `/api/devices`, `/api/devices/:id/rotate-key`; PATCH `/api/devices/:id` | Verified administrator + purpose/target-bound OTP | Registration/rotation returns plaintext key once with no-store; configuration changes audited. |
| GET `/api/devices/:id/command`; POST `/api/devices/:id/relay-ack` | Registered device ID/key | Own identity/site only; no legacy shared-key relay access, immutable acknowledgement. |
| POST `/api/relay/command` | Verified administrator + site access + output/device-bound OTP | Server/device permissions, explicit confirmation, 30-second expiry; intent/GPIO acknowledgement separate from physical state. |
| GET `/api/telemetry/latest`, `/history`, `/analysis` | Verified JWT + configured-site membership | Admin global access; viewer/operator must have explicit siteIds. No query may override site. |
| GET `/dashboard`, `/panels`, `/alerts`, `/forecast`, `/forecast/hourly`, `/ai/status`, `/bfci`, `/bfci/shap/:id`, `/cv`, `/cv/summary`, `/relay`, `/relay/history`, `/carbon`, `/carbon/monthly`, `/work-orders`, `/system`, `/health` | Verified JWT + configured-site membership | Several are unavailable stubs. Every route validates inputs; current server serves one configured site. |
| GET `/alerts/:id`, `/work-orders/:id`, `/carbon/reports`, `/carbon/reports/:id`, `/carbon/reports/:id/pdf` | Verified JWT + configured-site membership | Persistent site-scoped records; report PDF/evidence/hash never publicly exposed. |
| POST `/alerts`, `/work-orders`, `/work-orders/:id/comments`, `/carbon/report`; PUT `/alerts/:id/acknowledge`, `/alerts/:id/resolve`, `/work-orders/:id`; PATCH `/work-orders/:id` | Verified JWT + operator/admin + site | Strict schema, validated assignment, event/audit transaction, version conflict check and explicit report sufficiency policy. |
| GET `/work-orders/assignees` | Verified JWT + operator/admin + site | Eligible verified account IDs/names only; bounded directory. |
| GET `/camera/status`, `/camera/stream`, `/inspection-photos`, `/inspection-photos/:id`, `/inspections`, `/coating` | Verified JWT + site | Fixed server-only camera configuration; bounded stream/list/SQL lookups. Raster photo bytes are private, no-store, no public camera address/credentials. |
| POST `/camera/snapshots`, `/cv/scan`, `/inspection-photos`, `/inspections` | Verified JWT + operator/admin + site | Capture alias is not ML. Strict body/query validation, per-account photo rate limit, bounded image worker, metadata removal and site/photo binding; append-only record/audit transaction. |
| GET `/users` | JWT | Admin. |

All browser mutations with a cookie require the X-Voltarax-Request header. Exact-origin CORS rejects unapproved origins. JSON-only parsing prevents ordinary cross-origin form login. Native bearer clients remain supported. HTTPS/proxy handling must be verified on the target host.

Express sessions and Firebase Authentication are separate trust systems. The web app accesses RTDB through the authorized server. Direct Firebase role-based reads require trusted custom role claims and access/{firebaseUid}/sites/{siteId}=true set by an operator; clients cannot grant either. Passwords, challenges and audit nodes deny all client reads/writes, including Firebase admin-role clients. The Admin SDK bypasses rules and depends on server checks.

Simulator writes require an explicitly enabled, non-production demo project on the loopback database emulator. The CLI also verifies local API health before sending and refuses redirects. SMTP is disabled in demo mode. Tests use fake mail and generated short-lived credentials, never a real account or database.

Relational tables are queried with the server's configured site; caller site overrides are rejected. SQL migrations/imports need explicit CLI flags and are never applied on API startup. Notification recipients come from reviewed server configuration, never from alert bodies; logs contain no message body, OTP, email or Redis credentials. Template rendering escapes text. Missing Redis/SMTP switches cleanly disable delivery; configured queue errors are logged without provider details. Report generation rejects synthetic/demo data and unverified factors; the saved synthetic PDF is only a test fixture.

### Phase 9/10 route additions
| Route | Method | Authentication / role | Boundary |
| --- | --- | --- | --- |
| /api/map/states, /api/map/boundaries | GET | Verified session + configured-site membership, existing admin exception | Empty query; no site override; review/hash/budget; actual counts/energy/nulls |
| /ready, /api/ready | GET | Public safe dependency status | Empty query; no data/stack/secrets; bounded/coalesced/cache; 503 when unavailable |
| Frontend /healthz | GET | Public process status | Empty query, no-store/noindex, no field assurance |
/api/__fixture exists only in the owned test process, never mounted by server.js; the production image excludes tests. Each control needs an ephemeral nonce, loopback/demo guard.

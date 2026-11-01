# API conventions

The existing Express API is proxied by Next.js at `/api`. Dashboard endpoints are also available under `/api/voltvision`. See `SECURITY_CHECKLIST.md` for the complete access inventory.

## Data quality

JSON objects include a `dataQuality` classification and a separate `quality` map. Nested field paths use dots (for example `latest.temp_c`). Values are Measured, Estimated, Calculated or Unavailable. Existing domain maps such as sensor flags and SHAP values are not modified by metadata. Empty array responses retain their array shape and carry `X-Data-Quality: Unavailable`; nonempty object rows receive metadata. Error responses are Unavailable. User-record `toJSON` redaction runs before annotation.

Measured denotes a device-reported reading; it does not certify calibration. Calculated denotes an arithmetic or rule-based result. Estimated includes site-level allocation, performance ratios and carbon conversion. The panel grid is estimated from one site reading. Forecast figures are current-condition/scenario estimates; confidence intervals are unavailable. Missing tariff/tree methodology values are unavailable.

## Telemetry storage and migration

New readings use `readings/{site}/{key}` with an index on `ts`; current readings and analysis use `sites/{site}/latest` and `sites/{site}/analysis`. The HTTP bridge dual-writes legacy history atomically. The repository queries in pages of 500 and merges legacy records by device/timestamp until the site's migration-complete marker is explicitly set. Each read is site-filtered. Unaggregated periods over 50,000 records fail rather than returning partial totals. The Python reader similarly refuses an oversized unmigrated legacy store.

`tools/migrate-telemetry.cjs` validates a local JSON export by default and contacts Firebase only with explicit `--apply`. Migration and hardware verification steps are in `MANUAL_STEPS.md`.

## Unavailable features

Persistent alert resolution, CV scans, work-order updates and ESG report generation currently return HTTP 501 after authentication and operator/admin checks. Their UI actions are disabled and marked coming soon. Empty lists are not evidence of a working inspection/maintenance pipeline.

## Phase 2 API changes
- Registration (POST /api/auth/register) takes name, email, password (12–72 characters and at most 72 UTF-8 bytes), optional company. It returns 202 after requesting verification, with no session. New users are viewers with no sites assigned.
- Login and OTP resend take email/password; OTP verification also takes a six-digit string code. Browser responses use a cookie. Native callers explicitly set client:'native' to receive a token; store it only in local configuration.
- GET /api/auth/me obtains the server-authoritative user. POST /api/auth/logout revokes all devices. Cookies are httpOnly/SameSite=Lax and secure in production, with an eight-hour default lifetime.
- POST /api/auth/sensitive/request takes action ('password' or 'user-access') and target user ID. POST /api/auth/password takes password/code. PATCH /api/auth/users/:id/access (admin) takes role/siteIds/isActive/code. These codes are purpose/target bound and consumed once.
- GET /api/auth/audit (admin) returns recent identifier-only audit events (limit 1–500, default 100). Attempts and completed access changes are separate events.
- Browser mutations include X-Voltarax-Request:1 and use the same-origin API proxy. All endpoints reject unknown body/query fields. Request errors include field paths, never input values or stack traces.
- New verified viewers receive 403 for site data until assigned. Administrators can access the configured site. The backend currently serves only SOLAR_SITE_ID; requested site overrides are rejected.
- Rate limits default to one-process memory. REDIS_URL switches to shared counters and fails closed when unavailable. Limits: API 1000/15min, auth IP 30/15min, normalized email 10/15min, public forms/FAQ 10/15min, ingest 1200/15min. OTP resend cooldown is independently transactional.

## Device registry API (Phase 3)
- GET /api/devices: administrator; most recent 200 public device records. No hashes/keys are returned.
- POST /api/devices: administrator, body {device_id,site_id,name,code}. The site must equal SOLAR_SITE_ID. Request an OTP first with action:'device-register', target:device_id. Response returns a one-time key; store it only in local device secrets.
- POST /api/devices/:id/rotate-key: administrator, body {code}, sensitive action:'device-key-rotate'. Previous key stops authenticating immediately.
- PATCH /api/devices/:id: administrator, body {enabled,relayEnabled,code}, sensitive action:'device-configure'. No self-service device enrollment or public credential recovery.
- Device list metadata includes last_seen and firmware_version; these remain null/Unavailable until accepted device traffic is wired. Relay permission defaults false and does not itself issue a command.

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
- Device list metadata includes last_seen and firmware_version; these remain null/Unavailable until accepted device traffic is received. Relay permission defaults false and does not itself issue a command.

## Recorded energy, panel allocation and simulator limits

Dashboard energy and carbon totals integrate only valid recorded power intervals, capped at fifteen minutes per adjacent pair. No covered interval returns null/Unavailable; a covered interval with measured zero power returns zero. Dashboard energy_coverage_pct describes coverage of the elapsed IST day; carbon responses expose covered seconds by period. Gaps are not extrapolated and partial totals are not full-period yield claims. Carbon remains an estimate using the configured emission factor; its source must be reviewed before an ESG report is issued.

The panel grid is a virtual equal allocation of the primary site's reading only when SOLAR_PANEL_COUNT is explicitly configured. An unset count returns an empty list. Labels are virtual positions, not registered panel IDs. Per-panel health, voltage and temperature remain Unavailable; site_sensor_temp_c is the actual site sensor reading and panel_temp_avg_c remains null. No default count or inferred healthy/fault count is published.

Synthetic ingestion is allowed only with DEVICE_SIMULATOR_ENABLED=true in a non-production demo-* project using a loopback emulator. Payloads carry simulated:true, the UI shows Test data and numeric quality is Estimated. See tools/device-simulator/README.md. Real project credentials are ignored and SMTP is disabled in this mode.

## Registered-device ingest
POST /api/telemetry/ingest uses X-Device-ID and X-Device-Key. Send an integer Unix timestamp in seconds, optional matching device_id/site_id, firmware_version, numeric sensor fields and strict boolean sensors_ok flags. Identity is derived from the authenticated device. Timestamps may be at most 24 hours old or five minutes ahead. Responses are 201 for a new sample, 200 for an exact duplicate, 409 for a conflicting replay and 422 for invalid data/time/identity. data.accepted_reading is the accepted sample; data.latest is the actual primary site latest and may differ for delayed/secondary samples. Failed sensor flags remove their numeric fields. No client-supplied keys are stored with telemetry.

GET /api/devices/:id/history is administrator-only and accepts limit 1–1000. Dashboard/AI history defaults to SOLAR_DEVICE_ID; explicit secondary history is separate. The old shared HTTP key is disabled unless ALLOW_LEGACY_DEVICE_KEY=true; it binds to configured site/primary device and is a temporary migration path, not per-device authorization.

## Relay API
- GET /api/relay and /api/relay/history accept optional device_id (default SOLAR_DEVICE_ID); history also accepts limit. Verified site members can read. Physical channels stay null/Unavailable without contact feedback. command contains intent/status and an optional GPIO acknowledgement.
- POST /api/relay/command is admin-only, body {device_id,desired:boolean,code}. Request an email code first using action:'relay-command', target:'DEVICE_ID-on' or 'DEVICE_ID-off'. A code cannot be reused for the opposite output. Browser mutations include X-Voltarax-Request:1. A new command returns 202/pending and expires in 30 seconds; a second pending command returns 409.
- Registered hardware GET /api/devices/:id/command and POST /api/devices/:id/relay-ack use X-Device-ID/X-Device-Key and require the same device/site. The shared legacy key cannot control or acknowledge relays. ACK body: {command_id,ts,success,output?,reason}. Reason is one of none/disabled/expired/output-mismatch/unsupported-channel. Successful acks require a boolean output matching intent. Server sets received_at. No other device can acknowledge the command.
- Direct Firebase firmware uses relayCommands/DEVICE_ID and relayAcks/DEVICE_ID/COMMAND_ID. It cannot write commands. Its ACK received_at uses the Firebase server timestamp placeholder; rules reject edits, late writes and cross-device access. Five-second reconciliation persists expiry/failure/applied states. Applied means GPIO acknowledgement, not measured contact state.

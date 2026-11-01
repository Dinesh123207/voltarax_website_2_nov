# API conventions

The existing Express API is proxied by Next.js at `/api`. Dashboard endpoints are also available under `/api/voltvision`. See `SECURITY_CHECKLIST.md` for the complete access inventory.

## Data quality

JSON objects include a `dataQuality` classification and a separate `quality` map. Nested field paths use dots (for example `latest.temp_c`). Values are Measured, Estimated, Calculated or Unavailable. Existing domain maps such as sensor flags and SHAP values are not modified by metadata. Empty array responses retain their array shape and carry `X-Data-Quality: Unavailable`; nonempty object rows receive metadata. Error responses are Unavailable. User-record `toJSON` redaction runs before annotation.

Measured denotes a device-reported reading; it does not certify calibration. Calculated denotes an arithmetic or rule-based result. Estimated includes site-level allocation, performance ratios and carbon conversion. The panel grid is estimated from one site reading. Power estimates use current conditions only; future horizons and confidence intervals are unavailable. Missing tariff/tree methodology values are unavailable.

## Phase 6 current-power contract

GET /api/forecast returns estimated_current_power_kw or null, source_as_of/generated_at/valid_until (Unix seconds), model_version/model_metadata, data_origin and a reason. Legacy forecast_1h_kw/6h/24h/7d keys and confidence are null: current kW is no longer multiplied into unsupported future energy. Fresh validated model output is preferred; otherwise fresh primary daylight inputs can produce an explicitly unverified engineering estimate. Calibration, future weather and real-site accuracy remain unverified. The browser suppresses the displayed power at valid_until.

The backend reads canonical /sites/{site}/ai sections first; only an absent default-site canonical section may read legacy /solar_site/ai. Invalid canonical output never falls back to older data. Schema 2, site/device, finite values, model identity/parameters/validation, source-input age, model age, publication age and origin are checked separately. Schema 1 and remote synthetic results remain unavailable. RTDB-omitted nulls/empty lists normalize without inventing metrics. GET /api/ai/status exposes only validated/fresh status; missing results are model_unavailable, not a claim of insufficient training rows.

GET /api/forecast/hourly returns available sample averages for the current IST calendar day from at most the latest 2,000 primary-device records, with date_ist/hour/kw/samples/dataQuality. Failed measurements and other dates/devices are excluded, recorded zero retained, missing hours absent. This bounded sample view is not a complete-day energy total or weather forecast.

## Telemetry storage and migration

New readings use `readings/{site}/{key}` with an index on `ts`; current readings and analysis use `sites/{site}/latest` and `sites/{site}/analysis`. The HTTP bridge dual-writes legacy history atomically. The repository queries in pages of 500 and merges legacy records by device/timestamp until the site's migration-complete marker is explicitly set. Each read is site-filtered. Unaggregated periods over 50,000 records fail rather than returning partial totals. The Python reader similarly refuses an oversized unmigrated legacy store.

`tools/migrate-telemetry.cjs` validates a local JSON export by default and contacts Firebase only with explicit `--apply`. Migration and hardware verification steps are in `MANUAL_STEPS.md`.

## Unavailable features

Automated CV classification and numerical coating scores remain Unavailable. Phase 5 adds authenticated photo capture/proxy and manual observation records below; /cv/scan is now a capture alias, not an ML diagnosis. Persistent operations/reports/inspections need configured/migrated SQL storage and return 503 when missing. Empty lists are not evidence of fault-free equipment.

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

## Persistent operations (Phase 4)
The same routes are mounted at /api and /api/voltvision. They require configured/migrated PostgreSQL; missing storage returns 503 rather than an empty success. Verified site members read; operator/admin mutations also require the browser request header. Records use camelCase field names and ISO timestamps; displays use IST.

- GET /alerts accepts resolved=true/false and limit (1–200); POST /alerts takes title/message/severity. GET /alerts/:id returns the record and up to 200 recent history events. PUT /alerts/:id/acknowledge and /resolve take a nonempty note and persist actor/time/history/audit atomically.
- GET /work-orders accepts optional status and limit. POST /work-orders takes alertId,title,description,priority, optional assigneeId and dueAt (ISO offset date-time or null). The referenced alert and active verified operator/administrator must belong to the authorized site. GET /work-orders/assignees returns only IDs/names of eligible accounts; directory populations above 500 need pagination and fail safely.
- GET /work-orders/:id returns a detail/history. PUT or PATCH /work-orders/:id takes version,note and at least one of status,priority,assigneeId,dueAt. Stale versions return 409. Status flow is open → in_progress → closed; closed records are read-only, with additional comments supported by POST /work-orders/:id/comments {note}.
- The telemetry rule collector runs every 30 seconds when storage is configured. It deduplicates active rule episodes, observes offline age, and preserves resolved records until a cleared condition recurs. No alert record or empty list proves equipment safety or repair.

## ESG report snapshots (Phase 4)
POST /carbon/report takes {start,end}, inclusive calendar dates YYYY-MM-DD in IST, with operator/admin authorization. It accepts only completed periods of one to thirty-one days, sufficient recorded-power coverage (minimum 90%), an explicit positive operator-verified factor/source and no synthetic readings. Inadequate evidence returns 422; missing storage returns 503. It stores immutable evidence/PDF/hash plus audit and returns the ID, evidence and SHA-256.

GET /carbon/reports (limit 1–100, default 50) lists metadata; /carbon/reports/:id returns evidence/hash; /carbon/reports/:id/pdf streams the authenticated attachment. All are site scoped. Coverage, energy and record counts are Calculated, carbon/factor Estimated, physical uptime Unavailable. A real-data issuance or applicable factor was not verified in this run; the layout fixture is clearly synthetic.

## Camera and manual observations (Phase 5)
All routes below require verified site membership; mutations also require operator/admin and the browser request header. Camera configuration is server-only and disabled by default. GET /camera/status reports configuration, not online status; online/captureTime remain Unavailable. GET /camera/stream proxies only the fixed configured stream, never caller-supplied addresses. Streams cap at two total/one per account and sixty seconds/twenty MB; clients reopen deliberately. Redirects are refused.

- POST /camera/snapshots or /cv/scan with an empty body captures, sanitizes and saves a photo. It returns metadata only. No classifier, defect score or physical capture timestamp is inferred. savedAt is the server receipt timestamp.
- POST /inspection-photos accepts raw image/jpeg or image/png, up to two MB/four megapixels. It decodes/re-encodes in bounded worker threads, removes metadata and returns metadata without image bytes. Upload/capture are limited to ten per account/minute.
- GET /inspection-photos accepts limit 1–200; GET /inspection-photos/:id serves only the authorized site's sanitized raster bytes with no-store/nosniff/CSP protection. Original filenames/camera credentials/URLs are not stored or returned.
- POST /inspections takes kind (camera/coating), area, condition (clean/dusty/cracked/peeling/other/unknown), actual observedAt (ISO offset date-time), photoId and factual notes. Its photo must belong to the same site. Records are append-only and audited. GET /inspections accepts kind and limit 1–200, sorted by observation time.
- GET /coating returns the latest dated manual observation per normalized named area (up to 500, explicit truncated flag), visible categorical rules and counts by IST calendar date for the current day plus preceding 89 days. Counts are observations, not panels or prevalence. Categories expire after INSPECTION_MAX_AGE_DAYS (default 30); older status is Unavailable. score remains null. There is no ML/coating-material/repair certification.

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

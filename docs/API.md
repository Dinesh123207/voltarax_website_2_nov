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

# Phase 11 verification scope

The current local gate and exact evidence are in test-results/phase11-gate-summary.json: 88 backend, 28 AI, 10 UI and 4 actual-API browser cases; 15 screens exercised loading, empty, offline and error states. Eighteen axe scans reported zero violations and two incomplete contrast checks for manual review. This is a description of exercised cases, not an instrumented code coverage percentage or accessibility certification. External services, physical hardware and real field accuracy remain unverified.

---

# Historical Phase 10 coverage notes

# Verification coverage and limits

Final local code gate: 81 Node backend cases, 28 Python AI cases, seven UI/browser cases, three actual-API browser cases, one RTDB rule case and four native C++ cases. Placeholder ESP8266 firmware compilation, lint/types/build, audits, configuration parsing and current/history pattern scans are separate checks. No instrumented line/branch coverage percentage or complete production workflow coverage was measured. Counts are framework test cases, not counts of individual assertions or distinct business capabilities.

| Area | Exercised locally | Limit |
| --- | --- | --- |
| Energy and quality | IST boundaries, integration/coverage/gaps, valid zero/missing data, freshness, primary identity, response metadata, unknown panel/relay states | No calibrated sensors or real generation/carbon accuracy |
| Accounts/security | Real demo-SDK account/OTP/cookies/site grants/revocation/RBAC browser flow; unit/HTTP validation, limits, logs, session/auth failure; role/device RTDB rules | Fake sender; no real SMTP, Redis process or intended HTTPS host |
| Devices/relay | Registration/keys, ingest order/replay, bounded repositories, command/ack/expiry, actual local API browser acknowledgement, four native reliability cases and placeholder firmware build | No board flash, GPIO/contact, disconnect/load or camera field test |
| SQL operations/reports | Actual PGlite lifecycle/history/concurrency/outbox/assignee/report guards and PDF generation; safe missing storage | Not PostgreSQL/Redis services, live notification/report inputs or a restore drill |
| Camera/coating | Fixed URL/security, size/type/redirect guards, actual local raster sanitation, manual records/authorization/rule trends | No physical camera/classifier or numeric coating score |
| AI | Bounded reader, chronological split/train-only preprocessing, baseline metrics/acceptance, trusted artifacts, freshness/publication/drift contracts | Synthetic inputs; no field accuracy, weather-ahead forecast or live schedule |
| Commerce | Real SQL/HMAC/raw webhook/deduplication/uncertainty/refund-record logic; actual browser unset-price/order/pending callback/capture replay/PDF download | Fake gateway/widget; no hosted Razorpay TEST transport, real money, GST or fulfilment |
| Public/Hi/SEO/accessibility | Source-bound catalog/opaque values/option protocol; real browser language/keyboard/360px/form borders/labels/assistant/clock; HTTP metadata/noindex/robots/sitemap/PNG/liveness | UI APIs intercepted in seven cases; simulated visibility event; no independent AT/fluent/legal/Lighthouse review |
| Map | Exact original LFS hash, streamed 36-feature/1071165-coordinate validation, actual property names; authorized state join/null/zero/budgets; synthetic-square browser renderer/tooltips/table/missing state | Original oversized/unapproved, no invented India outline; approved web source/site assignment still required |
| Release | Expanded lint/types, standalone build/staged assets, actual artifact HTTP/browser, CI YAML/action pins, Compose syntax, official image tags/digests, source/history scan | No hosted workflow, image/runtime, deployment/DNS/TLS/backup/monitoring operation |

Evidence: `test-results/phase10-gate-summary.json` and its exact command/result files, plus retained earlier phase outputs. Earlier failed assertions, setup failures and timeouts were not erased; latest applicable corrected runs pass. The public browser fixture and the actual-API fixture have distinct report files. Fixtures use actual isolated demo/SQL databases, with no live user database, real recipient or payment gateway.

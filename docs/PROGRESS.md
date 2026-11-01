# Autopilot progress

RESUME HERE: Phase 7 — full backend/frontend/AI/audit/scan gate, tag only if passing, then Phase 8

Status key: [ ] todo; [~] in progress; [x] done and verified as stated; [!] skipped with a reason. A phase is done only after its full gate passes.

## Phase 1 — stabilization (phase-01-stabilize)

- [x] Prior baseline, source inventory, initial auth/energy/data-honesty fixes and synthetic tests; see `DECISIONS.md` for scope and limitations.
- [x] Adopt continuous in-place autopilot and create progress tracking.
- [x] Extract and catalog 23 reference archives, inspect root licenses and record preliminary source provenance. Symlinks were omitted; nested licenses still need review before any reuse.
- [x] Public/dashboard claims reviewed; unsupported operation, affiliation, patent, scientific fraction, deployment count, sample savings and environmental guarantees removed or qualified. Changes are recorded in CLAIMS_AUDIT.md, DECISIONS.md and Git history. Coming-soon features remain visible.
- [x] Shared dashboard section/metric badges and API response quality metadata implemented, preserving domain maps and record redaction. Missing values display Unavailable; tests passed. API conventions are documented in API.md.
- [x] Route inventory and role checks completed for current routes; route-group tests cover JWT/device authentication and viewer/operator/admin access. Tenant/site membership policy is deferred to Phase 2 and remains a launch risk.
- [x] Correct subscriber creation/reactivation and ID-based Firebase update; focused tests passed without a live database.
- [x] Paged site-partitioned telemetry repository, legacy compatibility, atomic bridge writes, site-scoped latest/analysis, offline-export migration tool and focused isolation/migration tests.
- [x] NodeMCU dual-write paths and bounded Python reader updated; focused Python reader test passed. Live migration was not run.
- [!] Firmware compilation, physical-device verification and real Firebase rule deployment require the hardware/toolchain/credentials; exact steps are in MANUAL_STEPS.md.
- [x] Production audits and non-breaking fixes completed; Nodemailer upgraded to 10.3.1 and PostCSS overridden to patched 8.5.26. Frontend production audit: 0 findings; backend production: 8 moderate, 0 high/critical. Remaining SDK/development findings and remediation are in KNOWN_ISSUES.md and MANUAL_STEPS.md. No unsafe forced downgrades were applied.
- [x] AI synthetic regression suite rerun: 8 passed; this does not verify hardware or real-data model accuracy.
- [x] Env examples cover every referenced app variable; firmware local secrets include site/device configuration. Secret scan passed.
- [x] Phase 1 local gate passed: 15 backend tests, 9 Python tests, lint, production build (including final rerun), typecheck and secret scan. Evidence is under test-results/. Remaining moderate advisories are explicitly documented. Firmware/Firebase external checks are skipped with manual steps. Tag: phase-01-done.

## Phase 2 — security and accounts
- [x] Email OTP, verified viewer registration, privileged bootstrap and tests.
- [x] Implement transactional hashed OTP challenges (six digits, ten minutes, five attempts, single use and resend cooldown) with a fake sender; three focused tests passed including concurrent replay rejection.
- [x] Wire registration/verification, purpose/target-bound sensitive action OTPs, disabled-by-default SMTP React Email templates and browser verification form. Focused account/template tests passed with fake mail only.
- [x] Enforce verified accounts, cookie sessions with revocation, explicit site membership and one-time administrator bootstrap. Focused lifecycle/bootstrap tests passed. No bootstrap or SMTP used against live services; legacy accounts must verify and receive site access.
- [x] IP/email rate limits with optional Redis store, structured redacted logs, request IDs, security headers and exact-origin CORS; focused HTTP tests passed. Redis server verification remains pending.
- [x] Zod schemas on every current endpoint, safe central errors, configured-site authorization and sensitive admin audit events. Route-group/invalid-input tests passed; frontend account screens typecheck and production build passed.
- [x] Firebase role/device rules passed the localhost demo emulator test (cross-site/device/role isolation, schema ranges and protected secrets). Live UID substitution/deployment stays manual. Administrator access/password screens are implemented; frontend gate checks recorded below.
- [x] Renovate config (automerge off), CI-ready production audit script and service READMEs. Production audit: frontend 0, backend 8 moderate, no high/critical. Tooling-only full audit is being recorded separately.
- [x] Phase 2 local gate: 23 backend tests, 9 Python tests, Firebase rule emulator (including rerun with patched test dependency), lint, final typecheck/build, diff check and secret scan passed. Frontend production audit 0; backend production 8 moderate, full tree 21 moderate; no high/critical. Evidence: test-results/phase02-*. Tag: phase-02-done.
- [!] Actual SMTP delivery, shared Redis and target-host TLS/proxy behavior require operator configuration; MANUAL_STEPS.md records exact follow-up. No real emails, live database changes or external deployment performed.

## Phase 3 — hardware
- [x] Device registry with one-time hashed keys, rotation/disable, admin screen and target-bound OTP. Three focused backend tests, device/layout lint and frontend typecheck passed. No live device registration performed.
- [x] Device-bound HTTP ingest, strict schema/identity checks, 24h/5min time window, deterministic replay handling and bridge repair. Primary-device dashboard/AI filtering and monotonic latest/analysis updates. Eight focused backend tests and one Python reader test passed. Live database behavior remains unverified.
- [x] Reconnect/backoff, NTP gating, sensor presence/range checks, watchdog, 12-sample history buffer, firmware version and native helpers. Placeholder-only ESP8266 compilation passed; all three native reliability tests passed. Hardware/flash/live Firebase verification remains manual.
- [x] Dashboard freshness suppression, honest unknown panel state, dust Estimated label and missing CV counts corrected. Focused backend tests and frontend typecheck passed.
- [x] Relay command state machine/API, administrator confirmation and target/output-bound OTP, 30-second expiry, immutable server-dated acks, scoped device policies and audit. Firmware compiles, four native tests pass, five focused backend tests and rule emulator pass; frontend typecheck/lint pass. Physical contact feedback remains Unavailable and real switching is not verified.
- [x] Synthetic-only loopback/demo-project simulator, disabled SMTP and Estimated test-data banner. Actual local database integration passed registration/OTP/password/session revocation, device authentication/replay/order, relay acknowledgement and disable. No live credentials or hardware used.
- [x] Fix conditional Firebase transactions on a cold SDK cache, exposed by the actual emulator (not by fakes). Seven focused regressions and the real-adapter integration passed.
- [x] Remove remaining default panel counts, invented panel health counts, copied panel voltage/temperature and empty-history zero energy. Virtual allocation requires configured count; recorded zero remains zero; period coverage is disclosed. Eight focused tests and frontend typecheck passed.
- [x] Final local gate: 32 backend tests, 9 Python tests, lint, separate typecheck and production build (298.03 seconds) passed. New real-adapter integration, rule emulator, four native tests and placeholder firmware build passed as recorded above. Production audits: frontend 0, backend 8 moderate, no high/critical. Secret scan: 359 files, no matches; diff check passed. Earlier CLI/build timeouts remain saved failures. Tag: phase-03-done.

## Phase 4 — alerts, work orders and reports
- [x] PostgreSQL/Drizzle TypeScript schema and generated SQL migrations; local PGlite lifecycle/episode tests passed (2). Conditional transitions, edit version checks, transactional event/audit/outbox records and cross-site isolation verified. Compose prepared; actual Docker PostgreSQL/Redis unavailable and not run.
- [x] Persistent alert create/acknowledge/resolve/history; 30-second primary-telemetry collector records rule episodes and offline observations. Reading timestamps preserved in analysis, missing sensor estimates remain absent. Six focused API/analysis/authorization tests passed.
- [x] Work orders from alerts, validated assignment, status, comments, due dates in IST, list/detail UI and history. Frontend typecheck and narrow lint passed. Real database/server and browser interaction checks remain pending.
- [x] Relational audit adapter and explicit offline legacy audit import; focused actual-SQL test passed (1), including identifier-only redaction and duplicate import with no second effect. Dry-run is the default; no live export/import performed.
- [x] BullMQ transactional outbox, capped exponential retries, retained/reconciled dead letters and disabled defaults; three focused notification/template tests passed with fake queue/mail and actual PGlite. No real mail/Redis execution.
- [x] Evidence-backed ESG PDF generation and immutable snapshots/hash, IST periods, coverage/factor/synthetic refusal, authenticated review/download UI. Three focused tests and frontend typecheck passed; synthetic two-page fixture visually inspected and text/page-count checked. Actual real-data report verification remains manual.
- [x] pgBackRest/Firebase backup and isolated restore instructions prepared in DEPLOY.md; live service setup, encryption/retention choices and restore drills are operator tasks and were not run.
- [x] Local gate: final 43 backend tests after tooling patch, frontend full lint/typecheck/build and 9 AI tests passed. Compose config and patched schema generation passed. Production audits frontend 0/backend 8 moderate; patched full backend audit 21 moderate, no high/critical. Scan: 443 files/no matches, diff check passed. Evidence: test-results/phase04-*. Tag: phase-04-done.
- [!] Actual PostgreSQL/Redis/SMTP, multi-process locking, real-data report issuance and backup restoration require configured services/data; exact operator checks in MANUAL_STEPS.md. No live services or real mail used.

## Phase 5 — camera and coating
- [x] Backend fixed-URL camera proxy and authorized saved snapshots, disabled default, bounded stream/capture/image decoding, metadata removal and explicit offline state. Three camera/metadata tests and two focused API/authorization tests passed, using only localhost fixture cameras. Hardware remains unverified.
- [x] Persistent photo/manual inspection schema/migration and actual observation time/area/condition/photo/notes, site checks and audit. One actual-PGlite test passed for photo isolation, time validation, latest dated area observations, stale categories and IST trends.
- [x] Camera/coating screens now capture/upload/select protected photos and save actual observations; visible rules, latest per-area categories, stale states, IST trends and record history. Frontend typecheck/narrow lint passed. BFCI/CV placeholders no longer fabricate aggregate scores/losses; numerical coating score and automatic ML classification remain explicitly Unavailable.
- [x] Local gate: 48 backend tests, 9 AI tests, full frontend lint, typecheck and production build passed (147.52 seconds). Production audits frontend 0/backend 8 moderate, no high/critical. Scan: 484 files/no matches; diff check passed. New migrations/index and IST trend boundary included. Tag: phase-05-done.
- [!] Physical camera/coating verification, actual image interpretation, browser workflow and real PostgreSQL restore checks remain manual/E2E work. No real camera or live service used; MANUAL_STEPS.md records exact setup and checks.

## Phase 6 — AI validation
- [x] Time-split evaluation with train-only preprocessing, MAE/RMSE/R2, training-only engineering baseline and labelled-only anomaly proxies. Six new focused evaluation tests, two existing power integration cases (plus origin rerun) and offline CLI passed. Saved output evaluated 2,880 marked synthetic inputs; no real-site accuracy claim. Real reviewed export not provided/used.
- [x] Reproducible isolated Python 3.13 environment with verified stable direct versions and freeze lock; install passed. The former requirements differed from actual earlier test runtime. No system environment changed. Failed relative executable startup is retained; absolute-path retry passed.
- [x] Versioned SHA-bound artifacts with site/device/origin/parameter/runtime checks, atomic manifests, writer locks and prior-version retention; legacy unverified pickles never loaded. Nine focused artifact/publication tests passed. Input/model clocks, strict publication schemas, bounded prediction-only latest reads and eligible-timestamp retraining implemented. Official Python SDK local demo read/publication passed (45.20 s) after loading project rules with a bounded 60 s setup timeout; initial missing-index/10 s setup failures retained. No remote project or real credentials used. API/UI validation is next.
- [x] Schema-validated publication and backend canonical-first consumer with separate source/model/publication clocks, identity/parameter/validation/origin checks. Actual Python model fixtures and official SDK readback pass six backend regressions, including RTDB-omitted empty/null normalization. Forecast UI displays version/training/source/held-out metrics and expires current power at valid_until. Narrow lint and typecheck passed; browser behavior remains for E2E.
- [x] Training-only light/temperature quantile reference, finite smoothed PSI on 50–500 newer eligible samples, explicit initial 0.2 review policy and unavailable/insufficient states. Four focused drift tests, seven backend cross-contract regressions, offline CLI, lint/typecheck passed. Validated optional publication and separate minute inference/hour drift/training schedule documented; no schedule enabled. Initial drift test clock error retained and corrected without weakening guards.
- [!] No reviewed real export, calibrated field labels, verified site/weather provider or validated confidence interval supplied/used. Current-condition fallback is implemented; exact real-data/provider review is manual. Synthetic metrics do not establish field accuracy.
- [x] Current-condition estimate only: unsupported horizon/confidence keys null, current engineering fallback uses fresh valid primary daylight inputs with explicit assumptions. Hourly sample view stays within current IST day, keeps recorded zero/missing gaps and discloses 2,000-row limit. No weather provider/site accuracy verified.
- [x] Local gate: 55 backend tests, 28 AI tests, full frontend lint/typecheck/build (85.76 s), production audits and diff check passed. Final scan: 593 files/no matches. Audits frontend 0/backend 8 moderate/no high-critical. Initial backend gate failed because one legacy test expected unvalidated fresh output and an auth fake omitted the new drift reader; corrected expectations/fake, nine focused cases and full 55-case retry passed. Evidence retained. Tag: phase-06-done; real-data accuracy remains unverified.

## Phase 7 — commerce
- [x] Read MIT Razorpay/SaaSify references and official Orders/Checkout/webhook docs; registry confirms Razorpay 2.9.8 MIT. Exact SDK install passed (15 s); no source copied, sample card/subscription data will not ship.
- [x] PostgreSQL plans with explicit unset price, transactional administrator version checks and immutable one-time order snapshots. No seeded products/prices. Generated SQL migration and two actual-PGlite order tests passed, including concurrent request-key deduplication, buyer isolation and unknown-create preservation. Actual PostgreSQL remains manual.
- [x] Six commerce tables prepared for owner-scoped orders, payments, event deduplication, invoices/refunds; no runtime automatic migration. Disabled-by-default test-key policy, constant-time raw HMAC and private ten-second/no-redirect pinned SDK adapter. Five focused policy/data-quality tests passed; availability headers now honor explicit Unavailable bodies.
- [x] Raw-body HMAC before SQL and JSON parsing, server-stored order callback verification, captured-webhook source of truth, exact amount/currency checks and transactional digest/event/payment/invoice deduplication. Four lifecycle tests and actual HTTP integration passed (including boundary rerun); callback alone never marks paid, out-of-order refunds roll back for retry, duplicate captures/refunds have no second effect.
- [x] Receipt-based uncertain-order reconciliation fetches only through guarded test adapter, never infers payment from an order fetch. Manual refund requests reserve remaining captured amounts and submitted references stay immutable; only signed processed events update refunded totals. No refund API is called. Immutable test invoice PDF/hash generated atomically with capture; one-page synthetic fixture text/page/visual review passed.
- [x] Public pricing, buyer order/detail/test Checkout/invoice links and admin plan/version/order/reconciliation/manual-refund screens. Account pages remain outside site-scoped dashboard so verified buyers do not need site access. Unset/disabled/error/uncertain states explicit; Razorpay loads only on a guarded buyer click. Narrow lint/typecheck passed; real browser/provider flow remains E2E/manual.
- [x] Exact decimal-INR to integer-paise conversion regression passed. Pinned SDK constructor-only test verifies ten-second/no-redirect adapter without a request. Six SQL order/lifecycle guard regressions passed; a fresh request key cannot bypass pending/uncertain/review-required purchase of the same plan. No live order/refund API was called.
- [x] Fake gateway/local SQL/HTTP tests and one-page synthetic test receipt review passed as recorded; captured signatures, idempotence, owner isolation and test/non-GST labels implemented.
- [ ] Full phase gate and tag. Real test-account checkout/PostgreSQL/browser behavior remain separate manual checks; GST invoices blocked until actual tax configuration/review.

## Phase 8 — public website
- [ ] Verified claims, English/Hindi, SEO, legal drafts, accessibility, performance and IST clock.
- [ ] Gate and phase tag.

## Phase 9 — India map
- [ ] Verify licensed boundary data, build real-data join and missing-data state, gate and phase tag.

## Phase 10 — testing, deployment and final report
- [ ] E2E tests, CI, Docker, deployment and backup documentation.
- [ ] Final scan, full test evidence, manual steps, known issues, release tag and evidence-based completion PDF.

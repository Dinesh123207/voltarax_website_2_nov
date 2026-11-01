# Autopilot progress

RESUME HERE: Phase 2 — email verification, session security and request validation

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
- [~] Email OTP, verified viewer registration, privileged bootstrap and tests.
- [x] Implement transactional hashed OTP challenges (six digits, ten minutes, five attempts, single use and resend cooldown) with a fake sender; three focused tests passed including concurrent replay rejection.
- [x] Wire registration/verification, purpose/target-bound sensitive action OTPs, disabled-by-default SMTP React Email templates and browser verification form. Focused account/template tests passed with fake mail only.
- [x] Enforce verified accounts, cookie sessions with revocation, explicit site membership and one-time administrator bootstrap. Focused lifecycle/bootstrap tests passed. No bootstrap or SMTP used against live services; legacy accounts must verify and receive site access.
- [ ] Rate limits, logging, headers, validation, Firebase rules and admin audit log.
- [ ] Dependency automation, gate and phase tag.

## Phase 3 — hardware
- [ ] Reconnect, time, sensor-fault handling, bounded buffer and firmware tests.
- [ ] Per-device keys, registration, simulator and validated ingestion.
- [ ] Relay commands, acknowledgement, timeout, authorization and audit; hardware verification manual.
- [ ] Gate and phase tag.

## Phase 4 — alerts, work orders and reports
- [ ] PostgreSQL/Drizzle migrations, alert lifecycle, work orders and audit records.
- [ ] Queued notifications, real-data ESG PDF, backup instructions, gate and phase tag.

## Phase 5 — camera and coating
- [ ] Authenticated camera proxy and real manual inspection records; gate and phase tag.

## Phase 6 — AI validation
- [ ] Time-split evaluation, transparent metrics and stale-result behavior.
- [ ] Drift/retraining checks; weather-ahead forecasts only with a documented source; gate and phase tag.

## Phase 7 — commerce
- [ ] Unpriced plans, test-mode Razorpay orders, verified signatures and idempotent webhook.
- [ ] Invoices, admin order/refund workflow, tests, gate and phase tag.

## Phase 8 — public website
- [ ] Verified claims, English/Hindi, SEO, legal drafts, accessibility, performance and IST clock.
- [ ] Gate and phase tag.

## Phase 9 — India map
- [ ] Verify licensed boundary data, build real-data join and missing-data state, gate and phase tag.

## Phase 10 — testing, deployment and final report
- [ ] E2E tests, CI, Docker, deployment and backup documentation.
- [ ] Final scan, full test evidence, manual steps, known issues, release tag and evidence-based completion PDF.

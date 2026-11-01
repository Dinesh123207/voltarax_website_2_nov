# Autopilot progress

RESUME HERE: Phase 1 — finish claims and data-quality coverage, then implement bounded site-aware telemetry queries

Status key: [ ] todo; [~] in progress; [x] done and verified as stated; [!] skipped with a reason. A phase is done only after its full gate passes.

## Phase 1 — stabilization (phase-01-stabilize)

- [x] Prior baseline, source inventory, initial auth/energy/data-honesty fixes and synthetic tests; see `DECISIONS.md` for scope and limitations.
- [x] Adopt continuous in-place autopilot and create progress tracking.
- [x] Extract and catalog 23 reference archives, inspect root licenses and record preliminary source provenance. Symlinks were omitted; nested licenses still need review before any reuse.
- [~] Capability copy reviewed and several unverified affiliation, patent, sustainability and sample-savings claims removed. Full sentence-level claims inventory and final review remain.
- [~] Shared data-quality type, overview/panel/forecast/carbon badges and dashboard/telemetry API quality metadata added; remaining sections and API responses still need labels and verification. Quality unit test passed.
- [~] Route inventory recorded and operator authorization added to inactive command stubs; backend test passed for their unauthenticated/viewer/operator/admin statuses and for user-list access. Full protected-group tests and site isolation remain.
- [x] Correct subscriber creation/reactivation and ID-based Firebase update; focused tests passed without a live database.
- [x] Paged site-partitioned telemetry repository, legacy compatibility, atomic bridge writes, site-scoped latest/analysis, offline-export migration tool and focused isolation/migration tests.
- [x] NodeMCU dual-write paths and bounded Python reader updated; focused Python reader test passed. Live migration was not run.
- [!] Firmware compilation, physical-device verification and real Firebase rule deployment require the hardware/toolchain/credentials; exact steps are in MANUAL_STEPS.md.
- [~] Security advisories identify 14.x as affected by issues patched in 15.5.x or later. Next.js and its ESLint config are installed at 15.5.28; ESLint CLI, TypeScript and production build passed. Post-upgrade frontend audit: 23 findings (0 critical, 3 high, 20 moderate); backend initial audit: 13 (2 high, 11 moderate). See `DEPENDENCY_AUDIT.md` for each finding and raw reports. These are package matches, not verified exploitability; remediation is unfinished.
- [x] AI synthetic regression suite rerun: 8 passed; this does not verify hardware or real-data model accuracy.
- [ ] Complete env descriptions, secret exclusions, gate and phase tag.

## Phase 2 — security and accounts
- [ ] Email OTP, verified viewer registration, privileged bootstrap and tests.
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

# Autopilot progress

RESUME HERE: Phase 1 — validate the Next.js upgrade and complete stabilization

Status key: [ ] todo; [~] in progress; [x] done and verified as stated; [!] skipped with a reason. A phase is done only after its full gate passes.

## Phase 1 — stabilization (phase-01-stabilize)

- [x] Prior baseline, source inventory, initial auth/energy/data-honesty fixes and synthetic tests; see `DECISIONS.md` for scope and limitations.
- [x] Adopt continuous in-place autopilot and create progress tracking.
- [x] Extract and catalog 23 reference archives, inspect root licenses and record preliminary source provenance. Symlinks were omitted; nested licenses still need review before any reuse.
- [~] Capability copy reviewed and several unverified affiliation, patent, sustainability and sample-savings claims removed. Full sentence-level claims inventory and final review remain.
- [~] Shared data-quality type, overview/panel/forecast/carbon badges and dashboard/telemetry API quality metadata added; remaining sections and API responses still need labels and verification. Quality unit test passed.
- [~] Route inventory recorded and operator authorization added to inactive command stubs; backend test passed for their unauthenticated/viewer/operator/admin statuses and for user-list access. Full protected-group tests and site isolation remain.
- [x] Correct subscriber creation/reactivation and ID-based Firebase update; focused tests passed without a live database.
- [ ] Bounded site-aware Firebase reads, compatible writers, migration tooling, rules and tests.
- [~] Security advisories identify 14.x as affected by issues patched in 15.5.x or later; 15.5.28 installation is running and hook/font warning fixes are pending verification. Initial audit: frontend 21 findings (1 critical, 9 high, 11 moderate); backend 13 (2 high, 11 moderate). These are findings from the pre-upgrade state, not verified exploitability.
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

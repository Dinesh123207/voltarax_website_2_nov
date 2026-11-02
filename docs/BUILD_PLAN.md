# Voltarax in-place improvement plan

> MODE CHANGE: The user's Phase 1 instructions supersede the earlier rebuild proposals below. `voltarax-web/` is the active codebase; do not create `app/` or replace the existing stack. Firebase remains the telemetry store. The audit below is historical context; its references to a new app, replacement auth and migration are superseded.

## Active roadmap

Phase 8 localization wiring/first content group: 35 source files, boundary regression/lint/types and actual Hindi About HTTP render passed. 69 Hindi entries of 971 source phrases are present; 902 pending. Continue validated translation batches plus manual chat/typewriter/template/attribute audit before claiming completion, then SEO/legal/accessibility/font and full gate.

Phase 8 routing foundation verified with actual local Next HTTP plus lint/source types: English/Hindi URLs/document language/navigation/preference, API/health bypass and localized Checkout CSP. Existing app moved in place, not rebuilt. Complete all page/workflow message translations and coverage next; SEO/legal/accessibility/font work and full phase gate remain pending.

Phase 8 copy/clock task: remaining unsupported claims removed, public business facts left unconfirmed, conditional current features updated, responsive navigation/IST clock implemented. Clock test and narrow lint/typecheck passed. Verified MIT i18n/sitemap dependencies installed. Next task is routing and English/Hindi messages, then SEO/legal/accessibility and full gate.

Phase 7 is locally gated/tagged (65 backend, 28 AI, full lint/typecheck/build/audit/scan/diff passed). Continue Phase 8 on its own branch. Real commerce/provider/PostgreSQL/tax checks remain explicit manual limits, not verified capabilities.

Phase 7 UI task verified by narrow lint/typecheck, exact currency conversion and six order/lifecycle regressions. Full phase gate is now required before phase-07-done. Next Phase 8 adds English/Hindi/SEO/legal/accessibility and reviews PDF font coverage; no browser/provider/hardware or tax claim is established.

Phase 7 lifecycle/API task verified: four SQL lifecycle tests, raw-body HTTP integration and synthetic receipt PDF text/page/visual review passed. Buyer/admin UI and final full gate are next; actual gateway/PostgreSQL/tax remain manual. No phase tag yet.

Phase 7 foundation: six commerce tables/migration, unpriced/versioned plans, buyer-scoped one-time order snapshots, request-key deduplication and preserved ambiguous creation are implemented. Two actual SQL tests and five policy/quality tests passed. Continue signed capture/refund/invoice lifecycle and HTTP/UI; no phase tag yet.

Phase 6 is locally gated/tagged: 55 backend/28 AI tests, lint/typecheck/build, audits, scan and diff passed. Continue on phase-07-commerce from this phase branch. Real-data/weather/manual-service limitations remain explicit; no live deployment or main/push changes.

Phase 6 drift task: four Python drift cases, seven backend cross-contract cases, offline CLI and UI lint/typecheck passed. Full gate is next; no phase tag until it passes. Real-site accuracy and weather-ahead forecasting remain manual/skipped due absent reviewed inputs/provider.

Phase 6 API/UI task passed six actual-contract/backend tests, narrow lint and typecheck. Future horizon scenarios are removed; current estimates expire and expose validation/source/model information. Drift/retraining checks and full phase gate remain.

Phase 6 artifacts/publication task: nine focused tests and official Python SDK demo read/publication passed. API/UI validation and drift checks remain before the gate. Minute inference/hour training schedules stay disabled pending separate operator setup; see AI README.

1. Baseline, source inventory, authorization, IST energy/carbon corrections, truthful UI/claims, efficient Firebase queries, secure configuration and tests.
2. Security/accounts: email OTP, rate limits, logging, headers, rules, audit and validation.
3. Hardware reliability, device registration, simulator, tests and verified relay control.
4. Persistent alerts/work orders, queued email and real ESG reports using PostgreSQL/Drizzle.
5. Secured camera inspection and coating records backed by real inputs.
6. Real-data AI validation and weather-aware forecasting only with a weather source.
7. Razorpay test-mode commerce, signature verification, idempotency and invoices.
8. Verified public content, English/Hindi, SEO, legal drafts and accessibility.
9. India map using verified licensed boundaries; supplied GeoJSON is an LFS pointer.
10. End-to-end testing, CI, Docker, deployment instructions, backups and monitoring.

Preserve Firebase and hardware data, use real measurements or clear unavailable states, and proceed continuously through phases under the user's autopilot instruction. Detailed task and gate status lives in `PROGRESS.md`.

### Phase 1 status (superseded detail below)

The Phase 1 local gate passed on 2026-11-01: 15 backend tests, 9 Python tests, frontend lint/typecheck/build, final secret scan, and production dependency audits. Bounded site-aware telemetry, compatibility writers, offline migration, quality metadata and truthful copy are implemented. Hardware compilation/live Firebase checks require manual verification and are explicitly skipped, not claimed passed. See PROGRESS.md and test-results/ for current evidence. Earlier in-progress text below is retained only as historical context.

In progress. A local baseline and phase branch exist. Source text files have been read in chunks and inventoried. Admin enforcement, IST energy calculations, selected honesty fixes, firmware secret separation, and indexed Firebase filters have been implemented. Remaining acceptance work includes a complete claims and route audit, consistently bounded queries without losing site-filter semantics, complete measured/estimated/calculated/unavailable labels, test coverage of the remaining behavior, and firmware/Firebase integration verification. See `DECISIONS.md` for limits. Do not treat Phase 1 as complete while those items remain open.

Date: 2026-11-01. Phase 0 audit. Details, source conflicts, and limitations are in `DECISIONS.md`. This plan is internal and must not publish the contents of the internal project reference.

## Current system

`voltarax-web/frontend` is a Next.js 14/React 18 website and dashboard; `backend` is an Express/Firebase API; `ai-engine` is a scheduled Python/scikit-learn pipeline; `hardware` contains ESP8266 firmware and a Raspberry Pi reference display. The normal path is sensors -> NodeMCU -> Firebase -> Express -> dashboard. The optional HTTP bridge writes to the same Firebase history. The AI engine reads history and publishes into Firebase. The camera viewer is separate from the web CV placeholder.

### Feature migration map

| Existing source | Current behavior | New destination / acceptance |
| --- | --- | --- |
| `frontend/app/page.tsx`, `about`, `products`, `technology`, `sustainability` | Marketing pages and static claims | Localized public routes; retain only substantiated, approved claims and non-confidential material (phases 1, 5). |
| `frontend/app/contact` and `backend/routes/content.js` | Contact/demo writes, subscribers, posts, admin lists | Validated contact/demo workflow and role-scoped admin inbox, preserving existing records via migration; expose posts only if real published content is approved (phases 2, 3, 5). |
| `frontend/app/login`, `backend/routes/auth.js`, `middleware/auth.js`, `models/User.js` | Password/JWT login, public viewer registration, role checks on some routes | Email OTP and server-side authorization with tenant/site membership and secure sessions; define a safe account migration, do not migrate passwords blindly (phase 2). |
| `frontend/app/dashboard`, `services/dashboardData.js` | Site overview, derived status, daily energy, synthesized panel grid | Site-scoped live overview with provenance, correct units, freshness and honest empty/offline states; use real per-panel readings only if available (phases 3, 7). |
| `dashboard/panels`, `backend/services/dashboardData.js` | Generates panel rows from one site reading | Real asset registry and readings, no assumed per-panel measurements (phases 3, 7). |
| `dashboard/alerts`, `services/solarAnalytics.js` | Rule-based alerts; resolve endpoint does not persist | Persist alert lifecycle with role checks, thresholds and timestamps; retain current formulas with configuration and validate on real hardware (phases 3, 7). |
| `dashboard/forecast`, `routes/voltvision.js`, `ai-engine/models/forecast` | Same-conditions regression and crude horizon multipliers | Label present estimate honestly; migrate model only with versioned data contract and validation, no fabricated confidence (phases 3, 8). |
| `dashboard/bfci`, `dashboard/cv`, `dashboard/relay`, `dashboard/work-orders` | Mostly unconnected or empty responses | Explicit unavailable states first; build only from real sensors, camera, actuators and maintenance data with access control and tested hardware contracts (phases 3, 7). |
| `dashboard/carbon`, `routes/voltvision.js` | Carbon estimate and report placeholder | Correct time/energy integration, configurable emissions factor with source and timestamp, real reporting only (phase 3). |
| `dashboard/users`, `dashboard/settings` | User display and session information | Admin-only user/role management, session settings, audit events and correct field mapping (phases 2, 3, 9). |
| `frontend/components/chat/ChatWidget.tsx`, `backend/routes/chat.js` | Local predefined FAQ | Localized FAQ initially; optional provider-backed assistant with user-scoped retrieval, output safety and clear disclosure after authentication exists (phase 8). |
| `backend/routes/telemetry.js`, `hardware/nodemcu/solar_monitor.ino` | Firebase direct writes and optional device-key HTTP ingest | Device-scoped MQTT/TLS ingest, schema validation, replay handling, storage, SSE, monitoring, and measured migration from existing firmware; do not interrupt existing Firebase pipeline (phase 7). |
| `hardware/raspberry-pi` | Local telemetry view and basic frame statistics | Keep as reference; integrate only verified functionality without labelling brightness metrics as defect detection (phase 7). |
| `ai-engine` | Readiness-gated anomaly, same-time power model, adaptive baseline; synthetic tests | Preserve existing Python service or use an explicitly validated replacement; fix gating and missing-value handling, add model provenance and held-out real-data validation (phases 3, 8). |
| New: pricing, orders, legal pages, map, subsidy/application tracker | Not implemented in the legacy application | Build only within the stated phase and scope; use unpriced/unavailable states, verified boundaries and reviewed legal/financial text (phases 4–6). |

## Legacy API and data inventory

- Auth: register, login, current user, logout. Password hashes and users live in Firebase `users`.
- Public content: contact, demo, subscribe, post list/detail; admin contacts, demos and stats under Firebase `content`.
- Telemetry: ingest, latest, history, analysis. Direct firmware writes `solar_site/latest` and `solar_site/history`; server writes analysis and analysis history.
- Dashboard: dashboard, panels, alerts/resolve, forecast/hourly, AI status, coating/BFCI, CV, relay, carbon, work orders, users and system/health. Several are stubs, not complete services.
- AI: Firebase `solar_site/ai/{forecast,anomaly,health,status}`, plus local serialized model artifacts. Important telemetry units: voltage V, current mA, power mW, illuminance lux, temperature C, humidity %, dust µg/m³, Unix seconds, device/site ID, sensor flags, RSSI and uptime.
- Site isolation is incomplete: several backend and firmware paths hard-code `solar_site`. The new schema must enforce membership and ownership in every query, not only filter the UI.

## Reference archive triage

All 23 supplied ZIPs were listed, not exhaustively read line by line. Treat them as third-party references, verify license and version at integration time, and install maintained packages instead of copying library source.

| References | Planned use / caveat |
| --- | --- |
| `next-shadcn-admin-dashboard-main.zip` | MIT base for `app/`; inspect package resolution, example screens and licensing; replace all sample data. |
| `SaaSify-Dashboard-Subscription-Management-main.zip` | Optional UI/business workflow reference; no inference that Voltarax sells subscriptions. |
| `better-auth-main.zip`, `drizzle-orm-main.zip`, `razorpay-node-master.zip` | Reference docs for auth, persistence and payment integrations; verify current version-specific APIs before coding. |
| `mosquitto-master.zip`, `DEMO_Jenkins_PlatformIO-master.zip` | Broker and firmware/testing examples; the supplied firmware targets ESP8266 and needs an explicit migration. |
| `india-state-boundries-geojson-master.zip`, `mapviewer-init.zip` | Map references; actual boundary GeoJSON is missing (LFS pointer); provenance and official-outline review required. |
| `next-intl-main.zip`, `next-sitemap-master.zip`, `playwright-main.zip` | Localization, SEO and end-to-end test references. |
| `coolify-main.zip`, `pgbackrest-main.zip`, `pino-main.zip`, `renovate-main.zip` | Deployment, backup, logging and dependency-maintenance references; verify actual infrastructure requirements. |
| `bullmq-master.zip`, `react-email-canary.zip`, `ratelimit-js-main.zip` | Evaluate for asynchronous work, email and rate limiting, respectively; do not add unnecessary services. |
| `timescaledb-main.zip`, `posthog-master.zip`, `transformers.js-main.zip` | Optional time-series, analytics and model references, not defaults; assess scale, privacy, cost and license. |
| `System-Design-KIT-main.zip` | Design reference; not a runtime dependency. |

## Phases and estimated effort

Ranges are rough person-days for an experienced engineer; they exclude third-party account approvals, content translation review, physical installation and real-world data collection. They are not calendar commitments.

| Phase | Deliverable and gate | Estimate |
| --- | --- | --- |
| 0 | Audit, feature map, risks, decisions and plan | 1–3 days |
| 1 | Template foundation, bilingual design tokens, branding, env validation; lint/typecheck/build | 3–7 days |
| 2 | PostgreSQL schema, migration framework, email OTP, sessions, site-scoped roles and tests | 5–10 days |
| 3 | Port verified legacy features, correct data errors, explicit empty/offline states, Firebase migration plan | 8–16 days |
| 4 | Configurable unpriced plans, Razorpay test checkout, signatures, idempotent webhook and refunds | 5–10 days |
| 5 | Localized public site, reviewed claims and legal drafts, SEO, contact and accessibility | 6–12 days |
| 6 | Licensed verified map, actual site data and accessible IST clock | 2–5 days plus dataset verification |
| 7 | Hardware provisioning, TLS/ACLs, MQTT ingestion, SSE, retention, simulator and firmware validation | 10–20 days plus physical tests |
| 8 | Scoped assistant, streaming, tests and real-data model evaluation | 5–12 days plus data collection |
| 9 | Security, dependency and accessibility audits, remediation | 4–8 days |
| 10 | CI, backups, recovery and deployment documentation, staging verification | 4–8 days |

The blueprint proposes an alternative delivery order; `AGENTS.md` specifies the phase order above. Incorporate its bilingual/mobile requirements into foundation and public pages while keeping its product and subsidy assumptions unverified.

## Migration and release safeguards

Current in-place implementation and verification are tracked in PROGRESS.md. The original isolation/new-app/no-Git notes below are historical and superseded by AGENTS.md and the final autopilot request. Phases 1–5 passed their local gates. Relational operations/reports and camera/manual coating records use the stated PGlite/fake-service/localhost verification limits. Phase 6 strengthens time-split model evaluation, preprocessing, metadata/freshness and drift checks. Real services, hardware and real-data model accuracy remain manual checks.

1. Keep the legacy application and Firebase data untouched; inventory the live schema, rules and backup/restore procedure before migration.
2. Create the new application in isolation. Use test credentials only; never send real messages or run live payments in development.
3. Design organization, site, device and membership boundaries first. Every reading, payment, alert and query must be scoped and authorized server-side.
4. Reconcile history and timestamps, units, sensor calibration and retained data before cutting over. Run old and new paths in parallel and compare results, then retain rollback capability.
5. Use only actual measurements, identify estimates, preserve last-update times, and make unavailable features explicit.
6. Verify against real devices and data, test authorization, accessibility, backup restoration and payment idempotency; review privacy, legal text and India boundaries before any public launch.

## Verification performed

- Python synthetic AI tests: 8 passed using `python -m pytest tests -q -p no:cacheprovider` from `voltarax-web/ai-engine`.
- The new app does not exist yet; build, typecheck, lint, real Firebase/hardware, browser and deployment tests were not run.
- The workspace is not a Git repository, so no phase branch or commit was made.
- Missing `chatgpt-master-prompt.md` and LFS-backed boundary data are recorded in `DECISIONS.md`; neither blocks writing this plan.

### Phase 2 verification scope
The local account tests use fake Firebase repositories and a fake email sender. They cover default viewer registration, mandatory verification, cookie flags, replay, site access, privileged access changes and revocation. HTTP boundary tests cover CORS, headers, limits, safe errors, malformed JSON and sensitive-log omission. Repository tests cover concurrent email reservation and atomic sensitive changes. Production SMTP, email ownership in the real domain, reverse-proxy trust, TLS cookies, Firebase deployment and shared Redis counters remain separate operator checks.

### Phase 8 public language task
Complete translatable headlines, public Hindi copy and source-preserving prepared assistant are implemented. Narrow lint/typecheck and actual HTTP public Hindi render passed; dynamic templates, remaining workflow copy, SEO/legal/accessibility and the full phase gate remain pending. Voice input is labelled coming soon pending an explicit privacy/provider review.

### Phase 8 language boundary checkpoint
977 active source messages now have Hindi entries with parameter parity. Explicit dropdown protocol values and locale-preserving account/work-order links prevent localization from changing API requests. Four boundary/coverage regressions, lint and source typecheck pass. SEO/legal/accessibility and the final phase gate remain pending; original entered records remain in their original language.

### Phase 8 public indexing
SEO helpers/routes and original English brand PNG are implemented with indexing off, reviewed-origin language URLs and noindex private/draft pages. Two policy tests, lint/types pass; expanded HTTP smoke needs a complete rerun after a cold private-route timeout. No website was published, submitted to a search engine or externally deployed.

### Phase 8 legal drafting checkpoint
Bilingual noindex privacy, terms and refund/cancellation drafts are implemented, linked at public/account entry points and pass source/type/lint checks. LEGAL_REVIEW.md records primary-source checks, retrieval limits and the operator/counsel inputs still required. A draft does not establish a legally approved production policy. Accessibility/font and the stable HTTP/full gate remain.

### Phase 8 accessibility and PDF coverage
Interaction, contact-label/validation, reduced-motion/performance and receipt glyph safeguards are implemented and narrow tests pass. English/ASCII fallback receipt passes text/page/render inspection while original Unicode data remains preserved. Five loopback browser checks are prepared; execute with the final owned production build and record real outcomes before tagging. Full Hindi PDF font output and independent AT/legal/field reviews remain manual/partial.

### Phase 8 local gate complete
Final evidence is phase08-gate-build-reviewed, phase08-gate-generated-types-reviewed and phase08-gate-web-reviewed, plus the full backend/AI and audit/scan files. 74 backend + 28 AI + five actual browser cases pass; public claims/language/indexing/legal drafts/interaction/font limits are implemented and scoped. Partial Hindi PDF/email, legal/fluent/AT/field/service reviews remain manual. Proceed to Phase 9; preserve the archive pointer and verify actual boundary data/property names before use.

### Phase 9 boundary checkpoint
Exact original recovered and offline schema inspected; two focused boundary tests pass. Reader/CLI enforce property, geometry, review/hash and web budgets. Implement authorized device/IST-energy join and client-only Leaflet/table next. Current outline publication and web-sized approved dataset remain manual.

### Phase 9 map implementation
Authenticated boundary/state routes, operator state assignment, real recorded-energy/device join, safe client-only Leaflet and table/missing state implemented. Finish expanded CLI/auth tests and browser/full local gate; original oversized/current-outline review remains explicit manual dependency.

### Phase 9 local gate complete
79 backend, 28 AI, production build/types/full lint, seven Edge/HTTP checks, production audit and scan/diff pass. See phase09-gate-summary.json. Approved web boundary/current-outline review remains partial/manual; no outline approximated or published. Proceed directly to Phase 10 actual-backend E2E, release operations and final evidence PDF.

### Phase 10 packaging/readiness checkpoint
Pinned CI and three actual-backend browser cases are verified as scoped in PROGRESS. Two readiness regressions pass; non-root multi-stage/standalone images and portable private Compose are prepared; actual Compose syntax passed. Engine/hosted CI/runtime/TLS/recovery remain unverified, exact settings in RELEASE_OPERATIONS.md. Shared fallback translations complete the current 1045-entry catalog. Final local gate, audit disposition, final reports and PDF remain.

### Phase 10 main local gate checkpoint
81 backend, 28 AI, expanded lint/types/standalone build, seven UI/HTTP and three actual API browser cases pass. Explicit Node postbuild stages assets and start uses standalone entry. Current issues, exact audit candidates/exposure and manual owners are consolidated; container/hosted/provider/field/legal reviews remain partial. Finish rules/native/placeholder compiler/final scan, candidate tag and report/PDF QA.

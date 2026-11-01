# Decisions and audit limitations

## 2026-11-01: In-place mode change

- [FOUND] The user's Phase 1 prompt supersedes the earlier `app/` rebuild, read-only legacy and PostgreSQL telemetry assumptions. `voltarax-web/` is the active codebase; Firebase, Express, Next.js, NodeMCU and Python components remain in use.
- [FOUND] The template is a UI pattern reference only. PostgreSQL/Drizzle are deferred to relational features; existing authentication will be extended, with email OTP and Hindi/English in later phases.
- [FOUND] The user explicitly authorized a local baseline commit on `main`, a baseline tag and then a phase branch, after secret scanning. No remote push is authorized.
- [FOUND] Earlier decisions and the old audit remain below as historical context where they conflict with this section.
- [ASSUMED] Git had no configured author. The explicitly authorized local baseline uses `Codex <codex@localhost>` as an automation identity; no global Git configuration was changed and no remote was configured.
- [FOUND] Firebase RTDB supports a single ordered field per query. Applying a server limit before filtering a different site could omit valid readings, so multi-condition queries retain local filtering and are not all bounded. Timestamp range queries now use the `ts` index; a site-partitioned schema or equivalent pagination is still needed for consistently bounded multi-site queries.
- [FOUND] Phase 1 claims corrected so far: the technology page's coating, camera, weather forecast, per-panel fault, digital-twin and autonomous-control claims; product page work-order/energy-flow and reporting claims; landing page forecast, control, camera, digital twin, reports and sensor coverage; relay, CV, BFCI, work-order, alert and forecast dashboard descriptions; and chat capability copy. The audit is incomplete: each remaining public/dashboard sentence still needs line-by-line verification before Phase 1 can be called complete.
- [FOUND] Alert resolution is not persistent; the API now reports it unavailable and the dashboard action is disabled. The carbon report endpoint now reports that generation is coming soon.
- [ASSUMED] Energy integration holds the previous recorded power for at most 15 minutes and clips intervals at IST period boundaries and the present instant. It does not extrapolate beyond the latest pair of readings. This retains the legacy gap cap and avoids inventing extended production.
- [FOUND] Installed Next.js 14.2.5 emitted a security-vulnerability warning during dependency installation. Verify and upgrade to a patched, compatible release in the security phase before deployment.
- [FOUND] The subscriber reactivation branch calls `.save()` on a plain Firebase model result, which has no such method, and new subscribers do not explicitly receive `isActive`. This remains to be fixed and tested. See `backend/routes/content.js` and `backend/services/firebaseModel.js`.
- [FOUND] If a trained AI prediction fails, the orchestrator records an error without replacing the prior published result. The API now rejects old or undated model results, but the orchestrator still needs explicit failure publication; fresh results may predate an intervening failed run.
- [ASSUMED] AI results expire after two hours by default (`AI_MAX_AGE_SECONDS=7200`), allowing for the documented hourly schedule. Deployments using a different schedule must configure an appropriate age; this is not model validation.
- [FOUND] An incomplete bridge payload previously defaulted sensor health to true and could yield a healthy score. Missing power/light readings now make the health result unavailable; absent sensor flags remain unknown.
- [FOUND] The admin user-list and existing `/api/admin/*` endpoints require admin authorization. Other dashboard routes require login but are not scoped per site or organization; viewer registration remains public. Full role/site isolation is still outstanding.
- [FOUND] Phase 1 local checks: backend `npm test` passed six tests, frontend `npm run lint` and `npx tsc --noEmit` passed, frontend `npm run build` passed, and AI `python -m pytest tests -q -p no:cacheprovider` passed eight tests. Frontend lint/build reported three hook dependency warnings and one font warning. Firebase emulator, live Firebase, physical hardware and browser integration were not tested.
- [FOUND] `docs/FILE_INVENTORY.md` records source text file counts and review status. Source text files were read in chunks; generated files, dependency trees, lockfiles and the binary reference PDF are excluded. Several files were subsequently edited and marked accordingly.

Date: 2026-11-01. This is an internal project document. The internal project reference contains sensitive business and IP information; do not publish its contents without review.

## Sources and scope

- [FOUND] The existing application is `voltarax-web/`, not `legacy/`. Treat it as read-only legacy source without moving it. Source: `voltarax-web/README.md` and `AGENTS.md`.
- [FOUND] The design blueprint is `C:/Users/JARVIS/Downloads/UI UX & Frontend Blueprint India Renewable Energy Platform.pdf`. The existing project also contains `voltarax-web/docs/Voltarax_Project_Reference.pdf` (internal). Both were read for this audit.
- [FOUND] The named `C:/Users/JARVIS/Downloads/chatgpt-master-prompt.md` was not present. The pasted instruction text and workspace `AGENTS.md` were available. Verify with PowerShell `Test-Path 'C:\Users\JARVIS\Downloads\chatgpt-master-prompt.md'`.
- [FOUND] All 23 named reference ZIPs were inventoried; this is not a line-by-line review of all third-party source. Selected manifests, readmes and the boundary file were inspected. Inspect relevant version-specific documentation and licenses before each integration.
- [FOUND] The workspace is not a Git repository. No branch or commit was created. Establish an appropriate repository and phase branch before committing; do not initialize a repository or publish private material implicitly.

## Requirements and conflicts

- [FOUND] The blueprint asks for English and Hindi from the start, 360px-first layouts, savings in INR, accessible status states, and separate user journeys. The English-only default in `AGENTS.md` is superseded by the blueprint. Hindi copy must be reviewed for accuracy.
- [FOUND] The blueprint proposes phone OTP, while `AGENTS.md` explicitly excludes SMS OTP and specifies email OTP. Use email OTP for the initial implementation; do not imply phone OTP is available. A phone-based journey requires a configured provider and a later explicit scope decision.
- [FOUND] The blueprint mentions Remotion; `AGENTS.md` explicitly prohibits it without a separate request. Use accessible static or existing media approaches instead.
- [FOUND] The blueprint's home-owner/subsidy journey is an assumption, while the internal project reference describes an early-stage bio-coated solar monitoring product aimed primarily at institutional and commercial pilots. Do not present subsidies, installer matching, expected savings, or government affiliation as established business offerings. Any calculator must label inputs and estimates and use verified, maintained scheme rules before launch.
- [FOUND] The source project reads a single Firebase site and its firmware reports site-level sensor data. The blueprint's per-panel telemetry and fully operational features are not established by the implementation. Do not display distributed site totals as individual panel measurements.
- [ASSUMED] Use `app/` for the new application, leave `voltarax-web/` unchanged, and keep downloaded archives in place as read-only references; no `legacy/` or `reference/` migration is needed for the audit.
- [ASSUMED] Default to quote-based contact until authorized product terms and prices are available. Follow the plan's configurable unpriced plans only when checkout is implemented; never invent prices or activate live payments.
- [ASSUMED] Installer is a planned separately scoped role, not an existing authorized account type. Site access must be explicitly scoped per user and verified server-side.
- [ASSUMED] No analytics, real emails, live payments, external deployment, or third-party account creation during this phase.

## Dependencies and data

- [FOUND] Template archive `next-shadcn-admin-dashboard-main.zip` contains an MIT license; retain the copyright and license when copying. Its package manifest declares Next.js `^16.4.3`, React `^19.3.1`, Tailwind CSS `^4.1.5`, shadcn `^4.23.0`, Recharts `^3.8.0`, Zod, React Hook Form and Zustand. These are manifest ranges, not proof packages resolve or a build works. Its README says RBAC/multi-tenancy is planned; do not assume its example screens enforce access.
- [FOUND] Node 24.19.0 and npm 11.17.0 are installed locally. Verify the chosen Node LTS and template dependencies at implementation time against https://nodejs.org/en/about/previous-releases and https://nextjs.org/docs/app/getting-started/installation.
- [FOUND] `india-state-boundries-geojson-master.zip` contains an Apache-2.0 license but its `india_states.geojson` is a Git LFS pointer, not map features. Its pointer states a 164,447,698-byte object. The actual properties and boundaries cannot be verified from that file. Obtain the actual licensed dataset and verify India's official outline before use; do not substitute `mapviewer` example boundaries without provenance and review.
- [FOUND] The supplied `mapviewer-init.zip` is a Leaflet abstraction and its example uses `ST_NM`; this does not establish the missing dataset's property names or official boundary compliance.
- [ASSUMED] Use standard PostgreSQL first and evaluate TimescaleDB only if measured history volume and retention requirements justify it. Treat PostHog, Renovate, BullMQ, Pino, react-email, transformers.js, next-intl, pgBackRest and other archives as references or optional tools, not automatic production dependencies.
- [ASSUMED] Preserve existing Firebase history and document a verified migration, rollback and parallel-validation strategy before switching ingestion. Do not remove legacy data or hardware access.

## Verification and risks

- [FOUND] `python -m pytest tests -q -p no:cacheprovider` in `voltarax-web/ai-engine` passed 8 synthetic tests on this machine. This is not validation against hardware, real telemetry or Firebase.
- [FOUND] The current backend carbon endpoint mixes seconds with millisecond timestamps in day/month integration, and the user-list endpoint lacks an admin role check. See `voltarax-web/backend/routes/voltvision.js`.
- [FOUND] Registration is public and creates a viewer; user and site isolation are not implemented. Protect both list access and individual resources in the replacement.
- [FOUND] The browser stores JWTs in localStorage; relay, CV, BFCI and work-order screens have disconnected/placeholder backend behavior. User-visible capability claims need to match the implementation.
- [FOUND] The health baseline model records the daylight-filtered count as `total_rows_at_train`, although the readiness check compares against total history; retraining can occur too often. Forecast is a same-conditions estimate, not a weather-ahead forecast.
- [SKIPPED: no new application exists] New-app lint, typecheck, build, acceptance tests and phase commit cannot be run in this audit. Do not call Phase 0 production readiness or claim the phase gates for an unbuilt app pass.
- [ASSUMED] Estimates in BUILD_PLAN.md are indicative engineering ranges, not calendar promises; actual staffing, integrations and validation data are unknown.

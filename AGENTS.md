# Voltarax project instructions

## Mission, folders, stack and roadmap

Work directly in `voltarax-web/`, preserving the existing Firebase telemetry, Express API and authentication, Next.js frontend, NodeMCU, Raspberry Pi and Python AI engine. It is not read-only. Do not create `app/` or rebuild from a template. Third-party code is read-only reference material. PostgreSQL/Drizzle are deferred to relational features; email OTP, Hindi and English are later phases. Label data measured, estimated, calculated or unavailable. Mark unfinished features coming soon and remove unsupported claims. Update `docs/DECISIONS.md` and `docs/BUILD_PLAN.md` as work proceeds. The user explicitly authorized initializing Git, one baseline commit on main and baseline tag after a secrets scan, followed by branch `phase-01-stabilize`; no pushes are authorized. Commands run in the existing frontend, backend and ai-engine directories, using their actual scripts.

1. Baseline, full inventory/read, authorization, IST energy/carbon fixes, truthful UI/claims, efficient Firebase queries, secure configuration, tests and build.
2. Security/accounts: email OTP, rate limits, logging, headers, rules, validation and audit.
3. Hardware reliability, device registration, simulator, tests and real relay control.
4. Persistent alerts/work orders, notifications and real ESG reports with relational storage.
5. Secured camera inspection and coating records backed by actual inputs.
6. AI validation and true forecasting only with suitable weather data.
7. Commerce in Razorpay test mode with signatures, idempotency and invoices.
8. Public website, English/Hindi, SEO, legal drafts and accessibility.
9. India map using verified licensed boundaries.
10. End-to-end testing, CI, deployment, backups and monitoring.

One phase at a time; start the next only on the user's instruction. Preserve data, never push, send real messages, run live payments, deploy externally or publish private material without explicit authorization.


## Safety and defaults

- Never ask questions when the work can proceed using documented assumptions. Record choices as [FOUND] or [ASSUMED] in `docs/DECISIONS.md`. Do not invent business facts or use confidential material in public copy.
- No secrets in source, history or logs. Never send real messages, use live payments, deploy externally, publish private materials, or delete data without explicit authorization. Do not use Remotion without an explicit request.
- Restrict admin routes on the server, scope site data to authorized users, protect device credentials, and preserve Firebase data and existing hardware connectivity.
- English and Hindi via next-intl are planned for Phase 8; email OTP only. No SMS OTP.
- Prices are unset until provided; no live checkout. India legal pages are drafts requiring legal review.
- Use `voltarax-web/frontend`, `voltarax-web/backend`, and `voltarax-web/ai-engine` for commands; verify the scripts in each package. Run meaningful tests and report exactly what passed or could not be run.
- Local commits go on phase branches after the explicitly authorized baseline. Never push or rewrite history.
- Respond with changed files, assumptions, verification results, remaining risks and the next step.

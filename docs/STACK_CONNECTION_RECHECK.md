# Stack connection recheck — 2 November 2026 IST

Scope: isolated local checks on branch `codex/sustainability-connections`. No live credentials, messages, payments, migration, deployment or hardware were used. The recorded cases do not prove every connection or code path is error-free.

| Connection | Result and evidence |
| --- | --- |
| Next.js → Express | Four browser cases passed through a production build proxy to actual API routes: `test-results/sustainability-api-fixture.json`. |
| Express → Firebase | The cases used an owned demo RTDB emulator; focused bounded-query/freshness cases passed in `sustainability-contracts.log`. Real project credentials/rules are not verified. |
| Express → SQL | Test checkout used temporary PGlite and actual SQL/signature logic. PostgreSQL server, migrations and concurrency were not exercised. |
| Python AI → Express contract | Seven backend checks passed against saved synthetic Python publication/SDK contract fixtures (`sustainability-ai-contract.log`); offline staged runtime imports passed (`sustainability-packaging.log`). No live model publishing or field accuracy verified. |
| Hardware → system | Relay acknowledgement was simulated; no device, physical contact, camera or sensor was tested. |
| Redis, SMTP, gateway | Fake sender and payment gateway were used; actual Redis, email delivery and Razorpay TEST services were not tested. |
| Container configuration | Synthetic Compose interpolation passed (`sustainability-compose.json`), but Docker engine was unavailable; no images or runtime were tested. |

## Connection issue identified

The Compose AI service passes `AI_FIREBASE_SERVICE_ACCOUNT_FILE` as a path inside the container but mounts no host credential file. A host-only path will fail. An operator must configure a private read-only secret mount and use its container path, or supply `AI_FIREBASE_SERVICE_ACCOUNT_JSON` privately. The example and RELEASE_OPERATIONS.md now explain this; no secrets or mounts were created. Likewise, Ollama loopback in the backend container refers to that container, not the host. Neither actual connection was tested.

## Presentation and accessibility

The original SVG solar landscape is responsive and respects reduced motion. English/Hindi 360px tests passed, including official-source links. Two axe page scans found zero automated violations and two incomplete color-contrast checks requiring manual inspection; no accessibility certification is claimed. Test evidence and screenshots use the `sustainability-accessibility-*` prefix. The public phrases are attributed to the PIB source; they do not establish an official partnership.

For normal local operation, `BACKEND_URL` is compiled into the frontend build. The isolated browser build used a fixture on port 38475; rebuild with `http://127.0.0.1:5000` for a normal local API, or the appropriate private backend hostname inside Compose. See VERIFICATION_AND_RUN_GUIDE.md and MANUAL_STEPS.md.

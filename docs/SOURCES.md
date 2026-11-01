# Reference sources

## Phase 8 localization/SEO preparation (2026-11-02)

- Original copy extraction/wiring/merge helpers use the already installed TypeScript compiler API (installed LICENSE.txt checked: Apache-2.0); no compiler source copied. Translation text is original, reviewed against current English copy, and does not create scientific/business facts. Exact source binding and opaque/nonstring preservation are tested. Hindi linguistic/legal review remains an operator task; the catalog is currently partial, as tracked in PROGRESS.md.

- Routing foundation now implemented and actual local HTTP tested. Existing next-intl API/docs were used with original configuration and a literal-copy lookup through its message context; no library/template source copied. English/Hindi seed navigation is not a claim of completed whole-app translation. Own source navigation update helper confines writes to existing app/components.
- Local loopback rewrite behavior investigated with actual diagnostics and upstream reports https://github.com/amannn/next-intl/issues/524 and https://github.com/vercel/next.js/issues/48230 . Our localhost binding/origin retry passed; this is an observed local setup issue, not proof of behavior on every proxy/version. Product middleware remained standard; temporary diagnostics removed before final rerun.

- Downloaded next-intl root LICENSE (MIT, Jan Amann) and next-sitemap root LICENSE (MIT, Vishnu Sankar) read before use. Official registry metadata saved for next-intl 4.14.9 (Next 15/React 18 supported) and next-sitemap 4.2.3; normal exact installation passed. Installed next-intl LICENSE also read; npm next-sitemap metadata states MIT and upstream reference retains the notice. No template/library source copied into product code.
- Official integration references read: https://next-intl.dev/docs/routing/setup , https://next-intl.dev/docs/routing/navigation and https://next-intl.dev/docs/routing/configuration . Next 15 uses middleware.ts; examples in current docs may call it proxy.ts for Next 16. Routing/messages are not yet claimed integrated. Original public-copy corrections use actual implemented modules and deliberately omit unsupported business/material/people facts rather than invent evidence.

Inspected archive root licenses and root package manifests on 2026-11-01. Classification is preliminary; inspect each project and nested license before adaptation. References are read-only and excluded from Git. Symlinks were omitted for safe extraction. No third-party source was copied into the application. Source snapshots may not identify a commit.

| Archive in Downloads | Root version | Root license assessment | License path | Symlinks omitted |
| --- | --- | --- | --- | ---: |
| `System-Design-KIT-main.zip` | not stated in inspected root manifest | MIT; retain notice | `System-Design-KIT-main/LICENSE` | 0 |
| `transformers.js-main.zip` | 0.0.1 | Apache-2.0; review notices | `transformers.js-main/LICENSE` | 2 |
| `timescaledb-main.zip` | not stated in inspected root manifest | Source-available / mixed; do not copy | `timescaledb-main/LICENSE` | 4 |
| `renovate-main.zip` | 0.0.0-semantic-release | AGPL; do not copy | `renovate-main/license` | 1 |
| `next-intl-main.zip` | not stated in inspected root manifest | MIT; retain notice | `next-intl-main/LICENSE` | 1 |
| `posthog-master.zip` | 0.0.0 | Other or mixed; inspect before use | `posthog-master/LICENSE` | 69 |
| `coolify-main.zip` | not stated in inspected root manifest | Apache-2.0; review notices | `coolify-main/LICENSE` | 1 |
| `pgbackrest-main.zip` | not stated in inspected root manifest | MIT; retain notice | `pgbackrest-main/LICENSE` | 0 |
| `pino-main.zip` | 10.4.0 | MIT; retain notice | `pino-main/LICENSE` | 0 |
| `bullmq-master.zip` | 6.5.3 | MIT; retain notice | `bullmq-master/LICENSE` | 2 |
| `react-email-canary.zip` | 0.0.0 | Other or mixed; inspect before use | `react-email-canary/LICENSE.md` | 0 |
| `ratelimit-js-main.zip` | 1.1.2 | MIT; retain notice | `ratelimit-js-main/LICENSE` | 0 |
| `playwright-main.zip` | 1.65.0-next | Apache-2.0; review notices | `playwright-main/LICENSE` | 0 |
| `next-sitemap-master.zip` | 1.0.0 | MIT; retain notice | `next-sitemap-master/LICENSE` | 0 |
| `DEMO_Jenkins_PlatformIO-master.zip` | not stated in inspected root manifest | MIT; retain notice | `DEMO_Jenkins_PlatformIO-master/LICENSE` | 0 |
| `drizzle-orm-main.zip` | not stated in inspected root manifest | Apache-2.0; review notices | `drizzle-orm-main/LICENSE` | 0 |
| `better-auth-main.zip` | not stated in inspected root manifest | MIT; retain notice | `better-auth-main/LICENSE.md` | 1 |
| `mosquitto-master.zip` | not stated in inspected root manifest | BSD-like; review exact terms | `mosquitto-master/LICENSE.txt` | 1 |
| `mapviewer-init.zip` | 1.0.0 | MIT; retain notice | `mapviewer-init/LICENSE` | 0 |
| `india-state-boundries-geojson-master.zip` | not stated in inspected root manifest | Apache-2.0; review notices | `india-state-boundries-geojson-master/LICENSE` | 0 |
| `razorpay-node-master.zip` | 2.9.8 | MIT; retain notice | `razorpay-node-master/LICENCE.txt` | 0 |
| `next-shadcn-admin-dashboard-main.zip` | 2.2.0 | MIT; retain notice | `next-shadcn-admin-dashboard-main/LICENSE` | 0 |
| `SaaSify-Dashboard-Subscription-Management-main.zip` | not stated in inspected root manifest | MIT; retain notice | `SaaSify-Dashboard-Subscription-Management-main/LICENSE` | 0 |

PostHog is not enabled; TimescaleDB is a design reference only. Boundary GeoJSON is a Git LFS pointer.

## External documentation consulted

- [Next.js denial-of-service advisory](https://github.com/vercel/next.js/security/advisories/GHSA-q4gf-8mx6-v5v3), accessed 2026-11-01: version risk and patched-version assessment. No code copied; upstream terms apply.
- [Next.js image-optimization advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw), accessed 2026-11-01: version risk and sharp dependency guidance. No code copied; upstream terms apply.
- [Firebase query documentation](https://firebase.google.com/docs/database/web/lists-of-data), accessed 2026-11-01: indexing and one-ordering-field constraint. No code copied; Google documentation terms apply.

### Account implementation sources (2026-11-01)
- Zod runtime schemas: https://zod.dev/basics and https://zod.dev/api (official documentation; package installed normally, MIT). safeParse used without reflecting input values.
- React Email render/toPlainText: https://react.email/docs/utilities/render and reference/react-email-canary/react-email-canary/LICENSE.md (MIT text verified); installed @react-email/render 2.2.0, no template source copied.
- Nodemailer TLS and disabled file/URL access: https://nodemailer.com/smtp and https://nodemailer.com/message (official docs; installed package, no copied source).
- Pino redaction reference: reference/pino-main/pino-main/docs/redaction.md (root MIT verified previously).
- Rate-store integration: https://github.com/express-rate-limit/rate-limit-redis (MIT, official README v6.0.2), https://redis.io/docs/latest/develop/clients/nodejs/connect/ (official docs). Installed rate-limit-redis 6.0.2, node-redis 6.3.1 and compatible express-rate-limit 8.7.2 after inspecting npm metadata. No source copied. Memory-boundary tests pass; real Redis integration remains unverified.
- Firebase rules semantics and test API: https://firebase.google.com/docs/database/security/core-syntax and https://firebase.google.com/docs/rules/unit-tests (official docs, 2026-11-01).
- Firebase test tooling installed from npm: @firebase/rules-unit-testing 6.0.0 and firebase 13.1.0 (Apache-2.0 per installed manifests), firebase-tools 15.34.2 (MIT). Java 21 and localhost demo database emulator 4.11.2 used. No source copied; no live project contacted by tests.
- Renovate options verified against https://docs.renovatebot.com/configuration-options/ (official docs, 2026-11-01). Config is original project configuration, no AGPL source adapted from the archive.
- gRPC security advisories: https://github.com/advisories/GHSA-m9gg-hp2v-232j and https://github.com/advisories/GHSA-f596-whhp-79r4 (official maintainer advisories, accessed 2026-11-01). Installed version 1.14.7 verified against npm registry metadata; scoped override tests recorded separately.

## Relational implementation sources (2026-11-01)
- Read reference/drizzle-orm-main/drizzle-orm-main/LICENSE (Apache-2.0), reference/bullmq-master/bullmq-master/LICENSE (MIT) and reference/pgbackrest-main/pgbackrest-main/LICENSE (MIT). No archive implementation source copied; normal packages and original application logic are used.
- Official Drizzle connection/migration docs: https://orm.drizzle.team/docs/connect-pglite, https://orm.drizzle.team/docs/get-started/postgresql-new and https://orm.drizzle.team/docs/migrations. Registry latest stable metadata verified: drizzle-orm 0.45.4 (Apache-2.0), drizzle-kit 0.31.11 (MIT), pg 8.23.1 (MIT). The docs advertise RCs in some examples; this project deliberately uses verified stable packages and tests their actual API.
- PGlite 0.5.14 installed as a test dependency. Apache-2.0 text read from installed LICENSE and https://raw.githubusercontent.com/electric-sql/pglite/main/LICENSE. Original client/test integration follows https://pglite.dev/docs/ and Drizzle docs; no vendored source.
- Node 24 native TypeScript module behavior verified locally; official reference https://nodejs.org/api/typescript.html. PostgreSQL pooling reference: https://node-postgres.com/features/connecting.
- Official container tags/storage conventions: https://hub.docker.com/_/postgres and https://hub.docker.com/_/redis. Compose uses PostgreSQL 18.6 and Redis 7.2.17 as separate services, not copied application source. Image/runtime licenses remain upstream. Containers have not been run on this machine.
- Notification/reports research: https://docs.bullmq.io/guide/retrying-failing-jobs and https://pdfkit.org/docs/getting_started.html. Registry versions verified before installation; implementation and verification remain tracked in PROGRESS.md.
## Firmware sources and tooling (2026-11-01)
- Existing Voltarax sketch retained and revised; reference DEMO_Jenkins_PlatformIO root MIT license inspected (Axel Boldt-Christmas/Carl Jensen). No example source copied.
- PlatformIO Core 6.2.0 installed in ignored .local-tools; telemetry disabled in its isolated core directory. Official native/test docs: https://docs.platformio.org/en/latest/platforms/native.html and https://docs.platformio.org/en/latest/advanced/unit-testing/frameworks/index.html. Native platform resolved 1.2.1. The first native attempt lacked GCC; an official PlatformIO toolchain install resolved toolchain-gccmingw32 1.50100.0 (the cached registry page's 1.40900.0 was unavailable). Tests are recorded separately.
- ESP8266 platform 4.2.1 (Apache-2.0) verified against https://github.com/platformio/platform-espressif8266/releases. GCC/Arduino SDKs are external build dependencies in ignored tooling output, not vendored product source; preserve applicable toolchain/runtime notices for distribution. Copyleft SDK/toolchain licenses must not be mistaken for a license to copy their sources into the app.
- Existing Firebase_ESP_Client dependency retained at 4.4.17: https://github.com/mobizt/Firebase-ESP-Client (MIT, root license read); verified its official Basic example for reconnect/timeout/JSON APIs. The newer FirebaseClient has a different API and was not substituted silently.
- Sensor package versions verified via official library.properties: Adafruit INA219 1.2.3 (BSD-3-Clause, license.txt read), BH1750 1.3.0 (MIT, LICENSE read), DHT sensor library 1.4.7 (MIT text, license.txt read). Libraries installed normally under ignored .pio; no source copied into tracked product files.

## Phase 4 delivery, reports and backup references (2026-11-01)
- Installed BullMQ 6.5.3 (MIT) and PDFKit 0.20.2 (MIT), with exact registry metadata verified before install. Read their installed LICENSE files; no source vendored. Used original outbox/processor/report layout code following https://docs.bullmq.io/guide/retrying-failing-jobs and https://pdfkit.org/docs/getting_started.html. Real queue delivery remains unverified.
- Redis service version 7.2.17 uses the BSD three-clause license verified at https://raw.githubusercontent.com/redis/redis/7.2.17/COPYING. It is an external local service, not copied app code. PostgreSQL 18 container volume convention verified against https://hub.docker.com/_/postgres.
- pgBackRest backup/runbook reference: downloaded doc/xml/user-guide.xml (MIT repository license read) and official https://pgbackrest.org/user-guide.html. No live backup/restore or server installation performed.
- esbuild development-server advisory verified at https://github.com/advisories/GHSA-67mh-4wv8-2f99. Installed esbuild MIT license read; scoped loader override uses patched 0.28.2 and actual schema generation was retested. No server mode is used.
- PDF QA used bundled Poppler and pypdf. The generated layout fixture is original, explicitly synthetic test content, not a real site report or copied third-party document.

## Phase 5 camera/image references (2026-11-01)
- Existing hardware/esp32-cam/README.md supplies the fixed ESP32 capture/stream endpoint pattern. No live camera was contacted. Original proxy code uses Node fetch/AbortController/stream backpressure following https://nodejs.org/api/globals.html#fetch; only localhost fixture servers were exercised.
- Registry versions verified before installation: jpeg-js 0.4.4 (BSD-3-Clause) and pngjs 7.0.0 (MIT). Their installed LICENSE files were read, as were official repository APIs at https://github.com/jpeg-js/jpeg-js and https://github.com/pngjs/pngjs. Normal dependencies, no vendored source or archive code copied. Original worker-thread validation/re-encoding strips metadata and bounds image size/pixels/time.

## Phase 6 evaluation references (2026-11-01)

## Phase 7 commerce references (2026-11-01)

- Header override behavior verified against https://nextjs.org/docs/app/api-reference/config/next-config-js/headers . Original typed Checkout loader uses the fixed official https://checkout.razorpay.com/v1/checkout.js only after buyer action; provider network/iframe behavior awaits operator testing. No screenshot/template code, sample card data or third-party business facts were copied.

- Verified raw-byte HMAC, duplicate event IDs and unordered delivery against https://razorpay.com/docs/webhooks/validate-test/ and payment entity docs at https://razorpay.com/docs/webhooks/payments/ . Original lifecycle code validates payment.captured/refund.processed and never treats Checkout callback/order fetch as captured confirmation. PDFKit is the already licensed MIT dependency; invoice layout/evidence are original and only synthetic English fixtures were reviewed.

- Read reference/razorpay-node-master/razorpay-node-master/LICENCE.txt (MIT, Copyright 2019 Razorpay) and documents/order.md/paymentVerfication.md, plus SaaSify's root LICENSE (MIT, Copyright 2025 Ahmad JX) and frontend/src/app/dashboard/billing/page.tsx. Sample card/subscription rows were not copied. Only general plan/order layout patterns inform original implementation.
- Current official registry verified razorpay 2.9.8/MIT/integrity before normal exact dependency installation. SDK retains upstream notice in node_modules. Original HMAC/persistence code follows https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps , https://razorpay.com/docs/api/orders/create/ and https://razorpay.com/docs/webhooks/validate-test/ . Private adapter timeout shape was inspected in the installed pinned dist/razorpay.js and dist/api.js; no vendor code copied or edited. No actual payment service call made.

- Artifact trust policy checked against https://joblib.readthedocs.io/en/stable/generated/joblib.load.html; hash integrity never authenticates an attacker-controlled pickle/manifest. Original storage code and tests, no source copied. Histogram/bin behavior checked against https://numpy.org/doc/stable/reference/generated/numpy.histogram.html; PSI thresholds/smoothing are explicitly initial project assumptions, not copied accuracy evidence. Demo setup checked against https://firebase.google.com/docs/emulator-suite/connect_rtdb and installed Firebase Admin Python SDK source; actual localhost SDK readback was tested. These are documentation/API references, not vendored product code.
- Original evaluation/pipeline code follows official scikit-learn guidance: https://scikit-learn.org/stable/common_pitfalls.html#data-leakage, https://scikit-learn.org/stable/modules/generated/sklearn.impute.SimpleImputer.html, https://scikit-learn.org/stable/modules/generated/sklearn.metrics.r2_score.html and https://scikit-learn.org/stable/modules/generated/sklearn.metrics.precision_recall_fscore_support.html. No third-party source or unverified study result copied.
- Direct stable versions verified via official PyPI JSON metadata before isolated installation: firebase-admin 7.7.0, pandas 3.1.0, NumPy 2.5.4, scikit-learn 1.9.1, joblib 1.6.0, python-dotenv 1.2.4 and pytest 9.2.0. URLs follow https://pypi.org/pypi/PROJECT/json. Installed metadata licenses are recorded in test-results/phase06-python-environment.json (Apache-2.0/BSD/MIT and NumPy's component expressions). Packages retain their upstream notices; none are vendored into product source.
- The existing downloaded transformers.js archive is not a source of PV training data or accuracy evidence. Existing sklearn models were retained and independently evaluated rather than importing unrelated weights/algorithms. Synthetic outputs are marked as such; no real data/provider API was accessed.

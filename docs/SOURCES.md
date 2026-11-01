# Reference sources

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

## Firmware sources and tooling (2026-11-01)
- Existing Voltarax sketch retained and revised; reference DEMO_Jenkins_PlatformIO root MIT license inspected (Axel Boldt-Christmas/Carl Jensen). No example source copied.
- PlatformIO Core 6.2.0 installed in ignored .local-tools; telemetry disabled in its isolated core directory. Official native/test docs: https://docs.platformio.org/en/latest/platforms/native.html and https://docs.platformio.org/en/latest/advanced/unit-testing/frameworks/index.html. Native platform resolved 1.2.1. The first native attempt lacked GCC; an official PlatformIO toolchain install resolved toolchain-gccmingw32 1.50100.0 (the cached registry page's 1.40900.0 was unavailable). Tests are recorded separately.
- ESP8266 platform 4.2.1 (Apache-2.0) verified against https://github.com/platformio/platform-espressif8266/releases. GCC/Arduino SDKs are external build dependencies in ignored tooling output, not vendored product source; preserve applicable toolchain/runtime notices for distribution. Copyleft SDK/toolchain licenses must not be mistaken for a license to copy their sources into the app.
- Existing Firebase_ESP_Client dependency retained at 4.4.17: https://github.com/mobizt/Firebase-ESP-Client (MIT, root license read); verified its official Basic example for reconnect/timeout/JSON APIs. The newer FirebaseClient has a different API and was not substituted silently.
- Sensor package versions verified via official library.properties: Adafruit INA219 1.2.3 (BSD-3-Clause, license.txt read), BH1750 1.3.0 (MIT, LICENSE read), DHT sensor library 1.4.7 (MIT text, license.txt read). Libraries installed normally under ignored .pio; no source copied into tracked product files.

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

# Manual steps and external verification

No real credentials or infrastructure actions are performed automatically. This document will be updated as work progresses.

1. Firebase device UID and firmware secrets: follow `docs/DEPLOY.md`; verify rules and indexes in an emulator before deploying, then validate on the real device.
2. GeoJSON: the supplied India boundary ZIP contains a Git LFS pointer, not the actual dataset. Obtain the actual licensed file and verify its properties and the official outline before displaying it.
3. Real sensor readings and calibration, camera, relay wiring and model performance require physical hardware and real data; they are not verified by synthetic tests.
4. Real SMTP, payment credentials, deployment, DNS and legal review remain manual. Do not use live payment mode or send real email during development.

## Remaining dependency advisories

1. Run `npm audit --omit=dev` and `npm audit` in both frontend and backend and compare with `docs/test-results/*-after.log`. Production high/critical findings were cleared in this run; moderate SDK/tooling matches are documented individually in `KNOWN_ISSUES.md`.
2. The Firebase Admin transitive fixes currently require a major SDK update: from `voltarax-web/backend`, use `npm install firebase-admin@14.5.0` in a separate branch, then run backend tests and emulator auth/database checks, and verify the real service-account initialization before deployment. This update has not been applied because isolated route tests cannot establish live SDK compatibility.
3. For development-only ESLint/nodemon chains, review each advisory and upgrade the tooling coherently. Do not run `npm audit fix --force` blindly: the audit suggests incompatible older tooling for some chains. Keep production installs on `npm ci --omit=dev` and review CI inputs as untrusted.

## Site-history migration (never run automatically)

1. In the Firebase Console, select the intended project, open Realtime Database, and export its JSON using the data menu. Keep the export private and outside Git.
2. From the workspace root, validate a site without contacting Firebase: `node tools/migrate-telemetry.cjs --input C:/private/firebase-export.json --site solar_site`. Repeat for each site's actual identifier. Invalid timestamps fail validation; correct the source export deliberately before continuing.
3. Back up the live database and test the migration in an emulator or staging project first. With the intended backend credentials configured locally, the explicit write command is `node tools/migrate-telemetry.cjs --input C:/private/firebase-export.json --site solar_site --apply`. This copies in batches and retains legacy history. It is not executed by this agent.
4. Compare source/destination keys, timestamps and counts. Upgrade every device to firmware that writes both `readings/{site}/` and the legacy path. Configure all UID placeholders in the local rules copy and test access. The example rules permit only `solar_site`; additional sites require separately scoped device identities/rules.
5. Only after verifying migration and retiring every legacy-only writer, set `migrations/site_history/SITE/complete` to boolean `true` in Firebase. Until then the server merges paged legacy history. Do not set this flag merely because the copy command finished; late legacy writes require another export/copy.
6. The API limits memory to 50,000 readings for an unaggregated period and returns an error instead of a truncated total. AI legacy compatibility also fails clearly above its configured window; migrate history before training on a larger legacy store. Long-term hourly aggregation remains later work.
7. Compile/flash the NodeMCU with its real local `secrets.h` and verify NTP time, both history paths, sensor values and connectivity on hardware. Firmware compilation and live Firebase integration have not been verified here.

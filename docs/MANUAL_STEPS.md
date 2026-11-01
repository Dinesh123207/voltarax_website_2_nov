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

## Phase 2 accounts — operator setup (not executed)
1. Configure JWT_SECRET and a separate OTP_SECRET with at least 32 random characters each in the ignored backend .env. Do not reuse example strings. Set SESSION_TTL_SECONDS (default 28800).
2. Configure SMTP_HOST, SMTP_PORT (465 or 587), SMTP_USER, SMTP_PASS and SMTP_FROM using your provider. Keep EMAIL_ENABLED=false until you authorize actual mail; then enable it and test delivery to an address you control. No real mail was sent by this run.
3. Existing accounts have no verified-email flag. Sign in with the existing password, complete the emailed code, then have an administrator assign siteIds. Old browser/native tokens require re-login. The Pi may request client=native in POST /api/auth/login after verification and store the returned token only in its local environment.
4. For the first administrator only, set BOOTSTRAP_ADMIN_ENABLED=true, ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD (16–72 characters, at most 72 UTF-8 bytes). Run npm run seed from voltarax-web/backend only after reviewing the target Firebase environment. Immediately set BOOTSTRAP_ADMIN_ENABLED=false and remove ADMIN_PASSWORD. Sign in and verify email. There is no default account or password.
5. If bootstrap fails after its claim, inspect bootstrap/admin and auditLog in the Firebase console. Do not delete/reset the lock until confirming whether a user was created. Existing administrators make bootstrap refuse to run; recover them through a reviewed operator procedure instead.
6. Administrators request a code with POST /api/auth/sensitive/request {action:'user-access', target:USER_ID}, then PATCH /api/auth/users/USER_ID/access {role,siteIds,isActive,code}. Browser mutations include x-voltarax-request:1. Each challenge applies only to that target/action and one attempt that succeeds. Separate attempts/applied audit events distinguish an incomplete change.
7. Change a password by requesting action:'password', target:YOUR_USER_ID, then POST /api/auth/password {password,code}. All sessions are revoked. Sign-out also signs out all devices.
8. Check API/browser cookie handling over HTTPS and the configured same-origin Next.js proxy before deployment. Cookies intentionally contain no Domain attribute. Never expose tokens in screenshots or logs.

## HTTP security deployment checks
- Set CORS_ORIGINS to exact frontend origins, comma separated, without trailing slashes. Cookie requests use the same-origin frontend proxy. Never use a wildcard with credentials.
- Keep TRUST_PROXY_HOPS=0 until the backend listens behind a trusted proxy with its direct port inaccessible externally. Set the exact hop count for that deployment and verify client IPs without logging request bodies/headers. Incorrect proxy setup can combine all users' limits or allow IP spoofing.
- For multiple API processes configure REDIS_URL. Run local Redis, test two processes share counters and stop Redis to confirm requests fail closed. This run tests the in-memory boundary; a Redis server was not running. Memory counters reset on process restart.
- Review API and frontend response headers over actual HTTPS. API CSP is restrictive for JSON; frontend script/style requirements need their own policy. HSTS is enabled in production only. Do not enable HSTS for a domain until HTTPS is working.
- Docker CLI exists but the Linux daemon is not running. Start Docker Desktop before the later compose integration checks; no daemon was started automatically.

## Firebase role/device rules — local checks first
- The default template pins the legacy device to UID PASTE_FIREBASE_DEVICE_UID_HERE, device_id nodemcu-01 and site solar_site. If your configured IDs differ, update a local ignored rules copy consistently before deployment. Do not weaken the UID check. Direct writes reject invalid fields, out-of-range values, future timestamps and deletion.
- Browser API accounts use Express JWTs, not Firebase Authentication. They cannot use the Firebase client SDK directly. If you need direct Firebase reads for another trusted client, set its role custom claim through a privileged operator tool and write access/FIREBASE_UID/sites/SITE_ID=true in the console/Admin SDK. Role claims alone do not grant viewer/operator access. Never let clients edit role/membership nodes.
- Run the isolated demo emulator from voltarax-web/backend: npx firebase emulators:exec --only database --project demo-voltarax --config ../firebase.test.json "node --test tests/firebase-rules.test.cjs". The config binds localhost, and the test refuses any non-local emulator target. This does not use the live database or deploy rules.
- Review the template against real firmware identifiers and your real Auth project, then use the existing DEPLOY.md local-copy steps. Live deployment remains manual and was not performed.
- Renovate configuration is prepared locally only. Connect/install the Renovate app on your repository yourself if desired. No remote repository, app installation or automatic merge was activated. CI may run python tools/audit-dependencies.py; moderate SDK advisories remain documented, high/critical or audit failure block the command.
- Frontend CSP currently permits inline Next.js scripts/styles. Review a nonce-based policy with the rendering strategy before tightening it. External media, analytics, payment and map providers are not allow-listed automatically; add only verified providers when their features are integrated.
- Legacy account emails may have been modified by the old express-validator email normalizer (for example Gmail dots/aliases). The new validator only trims and lowercases; if an existing address cannot sign in, an operator must reconcile it against the stored account instead of creating/promoting duplicates.
- Review any previously seeded public post in your live database. The seed script no longer publishes sample content, but this run did not read, delete or unpublish existing live records.

## Phase 2 Windows emulator cleanup
Firebase CLI reported shutdown while its demo JVM kept port 9000 open on Windows. The run stopped only its verified demo emulator process. tools/run-check.py now contains each Windows command in a kill-on-close process job, so a finished/timed-out check cleans its own descendants. Use the wrapper from the workspace root for repeated rule checks:

python tools/run-check.py --cwd voltarax-web/backend --name local-rules -- npm run test:rules

Do not kill an unknown process occupying the configured port. Review it or use a separate documented test port. No database records were deleted by cleanup.

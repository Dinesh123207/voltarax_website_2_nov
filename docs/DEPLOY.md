# Deployment and recovery

These are configuration steps, not confirmation of a production-ready deployment.

Current container, Compose, Coolify settings, environment scopes, readiness, DNS/TLS and rollback instructions are in [RELEASE_OPERATIONS.md](RELEASE_OPERATIONS.md). The storage backup/isolated restore procedures below remain applicable. Docker engine and actual deployment/recovery checks are not verified here.

1. In `voltarax-web/hardware/nodemcu/`, copy `secrets.example.h` to `secrets.h`. Fill in the Wi-Fi and Firebase device values locally; never commit or share that file. Build the firmware with the existing libraries and flash the board using your normal workflow.
2. `voltarax-web/firebase.rules.json` is a rules template. In Firebase Authentication, find the UID of the dedicated device account. Replace all occurrences of `PASTE_FIREBASE_DEVICE_UID_HERE` in a local copy of the rules with that UID, review the rules and indexes in the Firebase emulator, then deploy with the Firebase CLI using the intended project. Do not replace the UID with a wildcard. The Admin SDK bypasses these database rules.
3. Configure the backend and frontend using their `.env.example` files. Do not place real values in examples, commits, logs, or chat.

Changing the firmware or database rules requires hardware and Firebase verification. The existing direct-to-Firebase ingestion path remains in use.

For the rules, run PowerShell from `voltarax-web`. Set the UID value locally, then create the ignored rules and configuration copies:

```powershell
$deviceUid = 'REPLACE_WITH_FIREBASE_DEVICE_UID'
Copy-Item -LiteralPath firebase.rules.json -Destination firebase.local.rules.json
$rulesText = Get-Content -LiteralPath firebase.local.rules.json -Raw
$rulesText.Replace('PASTE_FIREBASE_DEVICE_UID_HERE', $deviceUid) | Set-Content -LiteralPath firebase.local.rules.json -Encoding utf8
'{"database":{"rules":"firebase.local.rules.json"}}' | Set-Content -LiteralPath firebase.local.json -Encoding utf8
```

Review both files and use the Firebase emulator before deploying. After selecting the intended Firebase project, deploy using:

```powershell
npx firebase-tools deploy --only database --project YOUR_PROJECT_ID --config firebase.local.json
```

Both local files are ignored by Git. The deploy command is not run automatically.

## Phase 2 service operation
Configure the variables described in backend/.env.example. EMAIL_ENABLED defaults to false and requires deliberate operator enablement. The browser accesses the API through Next.js; direct cross-origin cookies are not the supported default. Password registration needs email verification before access, and site data needs an administrator assignment.

Use one API process with the in-memory rate limiter, or configure Redis for shared counters. A configured Redis connection fails startup or requests when unavailable; it does not silently fall back. Request logs omit input values and use generated IDs.

With DATABASE_URL configured, new audit events use PostgreSQL. Without it, the existing RTDB path remains. Historical RTDB audit records need the explicit reviewed offline import in MANUAL_STEPS.md; sources are not deleted. Apply a retention/access policy and export logs through a trusted operator path. Do not expose the entire database to any browser client.

For production, do not install dev tooling in the backend image (npm ci --omit=dev). Firebase CLI/test SDK dependencies are local/CI tools, not server dependencies. The CI-ready production audit command fails on high/critical advisories or registry/audit failure; existing moderate Firebase SDK findings require the documented follow-up.

## Phase 4 storage and delivery
Local PostgreSQL/Redis Compose setup, migration guards and audit import are in MANUAL_STEPS.md. Runtime never applies migrations. Use Node 24 for native db/schema.ts loading; PGlite is test-only. PostgreSQL is required for persistent alerts/work orders/report snapshots, not for existing RTDB telemetry/accounts. Telemetry remains behind the bounded repository.

Operational email defaults disabled. It requires NOTIFICATIONS_ENABLED=true, configured TLS SMTP, REDIS_URL and one to twenty reviewed NOTIFICATION_RECIPIENTS. Demo emulator mode always disables SMTP. SQL entity/history/audit/outbox writes are atomic. The dispatcher adds stable outbox IDs to BullMQ, retries delivery up to five times with exponential backoff from five seconds and retains failed jobs as dead letters. It reconciles exhausted failed jobs after a restart. Disabled historical events are retained as disabled and are not automatically mailed on later enablement.

Email is at-least-once: a process failure after SMTP accepts a message but before SQL records sent can cause a duplicate. A stable Message-ID aids reconciliation but cannot guarantee recipient-side deduplication. Counts and safe logs do not claim actual inbox delivery. Review dead letters and deliberately retry only after checking the recipient/provider state; never automatically replay every failed/disabled event.

ESG reports require complete past IST calendar days (one to thirty-one), recorded-power coverage of at least ESG_MIN_COVERAGE_PCT (minimum 90), explicit GRID_EMISSION_FACTOR and public HTTPS source plus GRID_EMISSION_FACTOR_VERIFIED=true. No default assumption qualifies. Synthetic/demo readings cannot issue formal reports. Each immutable report stores evidence, PDF bytes and SHA-256 together with an audit event. Energy is Calculated; carbon is Estimated; uptime is Unavailable. A sufficient coverage percentage still does not verify calibration or operational uptime. Repository scan ceilings can reject large periods; build/review aggregations before increasing that bound.

## PostgreSQL backups and isolated restore drill
These are operator steps for the intended database host; no backup or restore was run here. Read the official pgBackRest guide and the downloaded MIT-licensed reference first. pgBackRest is an external tool, not vendored into the application. Install a release supporting the actual PostgreSQL major version and use a dedicated backup account/repository. The stock Compose image does not install/configure pgBackRest automatically.

1. Obtain the actual data directory with `SHOW data_directory;` and confirm the cluster identity. PostgreSQL 18's official container default is /var/lib/postgresql/18/docker with its parent volume; a host install may differ. Use that reviewed value as pg1-path in a stanza named voltarax. Set a private repo1-path, off-host encrypted copies and operator-approved retention. Keep passphrases out of logs and source; configure restrictive permissions.
2. Configure PostgreSQL archive_mode=on and archive_command='pgbackrest --stanza=voltarax archive-push %p' using the database administrator's reviewed restart/change process. Configure the repository, encryption and archive access as described by pgBackRest; this guide is not a substitute for its installation/permissions steps.
3. On that Linux database host, run `sudo -u postgres pgbackrest --stanza=voltarax stanza-create`, then `sudo -u postgres pgbackrest --stanza=voltarax check`. Only after checks pass run `sudo -u postgres pgbackrest --stanza=voltarax --type=full backup` and `sudo -u postgres pgbackrest --stanza=voltarax info`. Retain actual exit codes and inspect the archive/backup age.
4. Schedule reviewed full/differential backups and continuous WAL archiving. A proposed 02:00 IST daily slot is 20:30 UTC on the preceding date; record the scheduler's timezone explicitly. The operator must set recovery point/time objectives and retention rather than assuming this schedule meets them.
5. Restore drills use a separate empty non-production cluster, a separate directory/port and the matching PostgreSQL major version. After reviewing those absolute target paths, an administrator may run `pgbackrest --stanza=voltarax --pg1-path=ABSOLUTE_EMPTY_DRILL_DIRECTORY restore` under the proper account and start only that isolated cluster. Never apply a restore or delta option to an active/live directory as part of a drill.
6. Point a test API at the restored database with mail/queues disabled. Verify migration journal, report hash/PDF downloads, site isolation, alert/work-order history and counts, and audit import identities; document measured restore time. Backups are unverified until this succeeds. Keep the live database/source and rollback image unchanged.

## Firebase exports and restore drill
Use the intended Firebase Console > Build > Realtime Database > Data menu > Export JSON, or the official CLI's database:get command with an explicit project ID. Export only needed nodes when practical; a full export contains sensitive account/key material. Save exports under a private ignored directory such as .local-tools/private-backups, restrict access, encrypt off-host copies and retain the actual project/time metadata privately. Never commit exports or private credentials.

For a drill, create/select an empty non-production project yourself and confirm its project ID/URL. In its Realtime Database Data menu, use Import JSON for the reviewed export, then apply the reviewed test rules/UID bindings. Run bounded repository compatibility, OTP/session revocation and device/relay authorization tests there with SMTP and relay output disabled. Do not import into the live database, set migration-complete markers automatically or delete its legacy paths. Verify telemetry partitions, primary identity, timestamps and counts before any separately reviewed cutover. Firebase Authentication users/claims and local environment secrets require their own recovery plan; an RTDB JSON export does not recreate those.

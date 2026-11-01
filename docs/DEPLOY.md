# Deployment notes (Phase 1)

These are configuration steps, not confirmation of a production-ready deployment.

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

Audit events remain in RTDB until the relational phase. The API records admin access-change attempts/completions and bootstrap identifiers. Apply a retention/access policy and export logs through a trusted operator path. Do not expose the entire database to any browser client.

For production, do not install dev tooling in the backend image (npm ci --omit=dev). Firebase CLI/test SDK dependencies are local/CI tools, not server dependencies. The CI-ready production audit command fails on high/critical advisories or registry/audit failure; existing moderate Firebase SDK findings require the documented follow-up.

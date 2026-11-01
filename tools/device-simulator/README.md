# Synthetic-only device simulator

`node tools/device-simulator/index.cjs` prints a marked synthetic sample and sends nothing. `--send` requires an HTTP loopback origin, a local registered device key and an API whose health response explicitly confirms enabled demo emulator mode. Redirects are rejected. Keys are never printed.

The backend also rejects marked synthetic payloads unless DEVICE_SIMULATOR_ENABLED=true, FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 (or another local port), FIREBASE_PROJECT_ID starts with demo- and NODE_ENV is not production. It ignores service-account credentials in this isolated emulator mode. The dashboard shows Test data and measurements are labelled Estimated in simulator mode. SMTP is disabled in demo mode.

The verified integration command from the backend directory is:

```powershell
python ../../tools/run-check.py --cwd . --name local-simulator -- npm run test:device-emulator
```

It starts only the cached official demo database emulator with a 256 MB heap, prepares a synthetic registered device, uses a short-lived key internally, exercises registration/OTP/password/session changes, ingest/replay/reordering and a simulated relay acknowledgement, then closes the test server. It does not drive hardware, send emails or use a live database. First install Java and download the emulator using Firebase CLI if the official JAR is not already cached; the launcher reports a missing prerequisite without contacting a real project.

For a local device demo, start that database emulator and configure the backend as described in docs/MANUAL_STEPS.md. Set SIMULATOR_API_URL (default http://127.0.0.1:5000), SIMULATOR_DEVICE_ID (default simulator-01), SIMULATOR_SITE_ID (default solar_site) and a random SIMULATOR_DEVICE_KEY of at least 32 characters in the terminal environment. Run prepare-demo.cjs to provision that synthetic device; existing records with a different key/site are refused. Then run index.cjs with --send. No key is printed. Never register or send synthetic samples into a real project. Interactive account verification needs a test sender; the integration test injects one without SMTP.

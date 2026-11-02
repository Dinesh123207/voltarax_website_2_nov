# Start Voltarax on Windows

Open PowerShell in the folder containing `run-voltarax.py`. If dependencies or the local demo database are missing, do the one-time setup first:

```powershell
python run-voltarax.py --setup
```

Start the website and isolated demo API:

```powershell
python run-voltarax.py
```

The launcher opens `http://localhost:3000`. It displays a **synthetic demo administrator** login in the terminal. Demo data is temporary and disappears when the launcher stops; the demo does not use your live Firebase database. Keep the window open and press Ctrl+C to stop the services. If a port is occupied, stop its existing owner yourself; the launcher does not terminate unrelated processes.

The demo uses the project's existing test fixture and Firebase database emulator. It demonstrates the website, sign-in and the fixture-supported API workflows. It is not a real installation: some operations, camera, hardware, real OTP delivery, production payments and field AI are unavailable or simulated. Java, Python and Node.js 24.19.x (or a newer 24.x release) are required. Setup uses the project's locked npm dependencies and downloads the official database emulator if missing; it does not configure a real account or send a message.

## Connected test installation

After separately preparing an isolated Firebase test project and the private `voltarax-web/backend/.env` settings as described in [the running guide](VERIFICATION_AND_RUN_GUIDE.md), run:

```powershell
python run-voltarax.py --connected
```

This starts the existing backend and frontend against the configured project. The application can read and update that project's data. The launcher disables outbound email, notification delivery, payments, relay and camera; it does not create users, apply migrations, set up PostgreSQL/Redis, enable AI schedules or start hardware. Configure and verify those separately when authorized. Sign-in and data features depend on actual configured accounts and services. Do not point this test mode at a live project. The API and website listen locally; check host firewall and service configuration for the intended environment.

For a noninteractive demo startup, proxy and login check that stops its own processes afterwards, use `python run-voltarax.py --check`. Private local logs are kept under the ignored `.local-tools/launcher/` folder. Do not share them without review.

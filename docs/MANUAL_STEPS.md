# Manual steps and external verification

No real credentials or infrastructure actions are performed automatically. This document will be updated as work progresses.

1. Firebase device UID and firmware secrets: follow `docs/DEPLOY.md`; verify rules and indexes in an emulator before deploying, then validate on the real device.
2. GeoJSON: the supplied India boundary ZIP contains a Git LFS pointer, not the actual dataset. Obtain the actual licensed file and verify its properties and the official outline before displaying it.
3. Real sensor readings and calibration, camera, relay wiring and model performance require physical hardware and real data; they are not verified by synthetic tests.
4. Real SMTP, payment credentials, deployment, DNS and legal review remain manual. Do not use live payment mode or send real email during development.

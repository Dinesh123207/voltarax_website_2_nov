# Security checklist

## Baseline scan

- A local filename and text-pattern scan found no `.env` secret files, firmware `secrets.h`, service-account key files, PEM/key/PKCS files, or common cloud/API token patterns outside examples. The backend example contains a private-key placeholder, not a real key. This limited scan is not proof that all secrets are absent.
- Before sharing any real Firebase service-account credentials, device passwords, Wi-Fi credentials, API keys, JWT secrets, SMTP credentials, or firmware `secrets.h`, keep them out of Git. **Must be rotated if ever shared** or exposed in Git history.
- Check actual local configuration and any external repositories separately before deployment or sharing. Never paste real values into logs or issue reports.

## Route access inventory (Phase 1; site isolation remains unfinished)

The dashboard router is mounted both at `/api` and `/api/voltvision`; entries below apply to both prefixes. The public health check is `/health`.

| Methods and routes | Authentication | Role / notes |
| --- | --- | --- |
| GET `/health` | None | Public process health only. |
| POST `/api/auth/register`, `/api/auth/login` | None | Public; registration creates viewers. Verification/rate-limit work remains in Phase 2. |
| GET `/api/auth/me`; POST `/api/auth/logout` | JWT | Any active account. |
| POST `/api/contact`, `/api/demo`, `/api/subscribe`, `/api/chat` | None | Public form/FAQ; stronger validation and endpoint-specific throttling remain in Phase 2. |
| GET `/api/posts`, `/api/posts/:slug` | None | Published content only. |
| GET `/api/admin/contacts`, `/api/admin/demos`, `/api/admin/stats` | JWT | Admin. |
| POST `/api/telemetry/ingest` | Device key | Shared key; per-device keys remain Phase 3. |
| GET `/api/telemetry/latest`, `/history`, `/analysis` | JWT | Any active account; no site isolation yet. |
| GET `/dashboard`, `/panels`, `/alerts`, `/forecast`, `/forecast/hourly`, `/ai/status`, `/bfci`, `/bfci/shap/:id`, `/cv`, `/cv/summary`, `/relay`, `/relay/history`, `/carbon`, `/carbon/monthly`, `/work-orders`, `/system`, `/health` | JWT | Any active account; several are unavailable stubs; no site isolation yet. |
| PUT `/alerts/:id/resolve`, `/work-orders/:id`; PATCH `/work-orders/:id`; POST `/cv/scan`, `/carbon/report` | JWT | Admin or operator; currently return 501, no persistent action. |
| GET `/users` | JWT | Admin. |

Authentication alone does not provide tenant/site authorization. Route-level validation and full integration tests are incomplete.

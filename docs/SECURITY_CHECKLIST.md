# Security checklist

## Baseline scan

- A local filename and text-pattern scan found no `.env` secret files, firmware `secrets.h`, service-account key files, PEM/key/PKCS files, or common cloud/API token patterns outside examples. The backend example contains a private-key placeholder, not a real key. This limited scan is not proof that all secrets are absent.
- Before sharing any real Firebase service-account credentials, device passwords, Wi-Fi credentials, API keys, JWT secrets, SMTP credentials, or firmware `secrets.h`, keep them out of Git. **Must be rotated if ever shared** or exposed in Git history.
- Check actual local configuration and any external repositories separately before deployment or sharing. Never paste real values into logs or issue reports.

## Route access inventory (updated Phase 2)

The dashboard router is mounted both at `/api` and `/api/voltvision`; entries below apply to both prefixes. The public health check is `/health`.

| Methods and routes | Authentication | Role / notes |
| --- | --- | --- |
| GET `/health` | None | Public process health only. |
| POST `/api/auth/register`, `/api/auth/login`, `/api/auth/otp/request`, `/api/auth/otp/verify` | Password + OTP before account access | Viewer registration; Zod, IP/email limits, six-digit single-use OTP, no token before verification. |
| GET `/api/auth/me`; POST `/api/auth/logout` | Verified, active JWT session | Cookie or native bearer; audience/issuer/version. Logout revokes every device. |
| POST `/api/auth/sensitive/request`, `/api/auth/password` | Verified JWT + action/target-bound OTP | Own password; user-access codes require admin. |
| PATCH `/api/auth/users/:id/access`; GET `/api/auth/audit` | Verified JWT | Admin only; access changes require OTP and log attempt/applied events. No self access mutation. |
| POST `/api/contact`, `/api/demo`, `/api/subscribe`, `/api/chat` | None | Public form/FAQ by design; Zod, bounded inputs, endpoint throttling. |
| GET `/api/posts`, `/api/posts/:slug` | None | Published content only. |
| GET `/api/admin/contacts`, `/api/admin/demos`, `/api/admin/stats` | JWT | Admin. |
| POST `/api/telemetry/ingest` | Device key | Shared key; per-device keys remain Phase 3. |
| GET `/api/telemetry/latest`, `/history`, `/analysis` | Verified JWT + configured-site membership | Admin global access; viewer/operator must have explicit siteIds. No query may override site. |
| GET `/dashboard`, `/panels`, `/alerts`, `/forecast`, `/forecast/hourly`, `/ai/status`, `/bfci`, `/bfci/shap/:id`, `/cv`, `/cv/summary`, `/relay`, `/relay/history`, `/carbon`, `/carbon/monthly`, `/work-orders`, `/system`, `/health` | Verified JWT + configured-site membership | Several are unavailable stubs. Every route validates inputs; current server serves one configured site. |
| PUT `/alerts/:id/resolve`, `/work-orders/:id`; PATCH `/work-orders/:id`; POST `/cv/scan`, `/carbon/report` | JWT | Admin or operator; currently return 501, no persistent action. |
| GET `/users` | JWT | Admin. |

All browser mutations with a cookie require the X-Voltarax-Request header. Exact-origin CORS rejects unapproved origins. JSON-only parsing prevents ordinary cross-origin form login. Native bearer clients remain supported. HTTPS/proxy handling must be verified on the target host.

Express sessions and Firebase Authentication are separate trust systems. The web app accesses RTDB through the authorized server. Direct Firebase role-based reads require trusted custom role claims and access/{firebaseUid}/sites/{siteId}=true set by an operator; clients cannot grant either. Passwords, challenges and audit nodes deny all client reads/writes, including Firebase admin-role clients. The Admin SDK bypasses rules and depends on server checks.

# Security checklist

## Baseline scan

- A local filename and text-pattern scan found no `.env` secret files, firmware `secrets.h`, service-account key files, PEM/key/PKCS files, or common cloud/API token patterns outside examples. The backend example contains a private-key placeholder, not a real key. This limited scan is not proof that all secrets are absent.
- Before sharing any real Firebase service-account credentials, device passwords, Wi-Fi credentials, API keys, JWT secrets, SMTP credentials, or firmware `secrets.h`, keep them out of Git. **Must be rotated if ever shared** or exposed in Git history.
- Check actual local configuration and any external repositories separately before deployment or sharing. Never paste real values into logs or issue reports.

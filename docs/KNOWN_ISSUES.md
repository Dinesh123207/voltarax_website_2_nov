# Known issues and audit disposition

## Remaining dependency matches (2026-11-01)

Frontend production audit: zero findings after non-breaking fixes and a PostCSS 8.5.26 override. Backend production has moderate Firebase Admin transitive findings; no high or critical findings remain in either production tree. Full raw results and commands are under test-results/.

| Package | Severity | Installed exposure | Exact suggested remediation | Advisory |
| --- | --- | --- | --- | --- |
| frontend / `@eslint-community/eslint-utils` | moderate | Development tooling only | npm install eslint-config-next@0.2.4 (breaking; compatibility review) |  |
| frontend / `@eslint/eslintrc` | moderate | Development tooling only | npm install eslint@4.0.0 (breaking; compatibility review) |  |
| frontend / `@humanwhocodes/config-array` | moderate | Development tooling only | npm install eslint@4.0.0 (breaking; compatibility review) |  |
| frontend / `@typescript-eslint/eslint-plugin` | moderate | Development tooling only | npm install eslint-config-next@0.2.4 (breaking; compatibility review) |  |
| frontend / `@typescript-eslint/parser` | moderate | Development tooling only | npm install eslint-config-next@0.2.4 (breaking; compatibility review) |  |
| frontend / `@typescript-eslint/type-utils` | moderate | Development tooling only | npm install eslint-config-next@0.2.4 (breaking; compatibility review) |  |
| frontend / `@typescript-eslint/typescript-estree` | moderate | Development tooling only | npm install eslint-config-next@0.2.4 (breaking; compatibility review) |  |
| frontend / `@typescript-eslint/utils` | moderate | Development tooling only | npm install eslint-config-next@0.2.4 (breaking; compatibility review) |  |
| frontend / `eslint` | moderate | Development tooling only | npm install eslint@4.0.0 (breaking; compatibility review) |  |
| frontend / `eslint-config-next` | moderate | Development tooling only | npm install eslint-config-next@0.2.4 (breaking; compatibility review) |  |
| frontend / `eslint-plugin-import` | moderate | Development tooling only | npm audit fix |  |
| frontend / `eslint-plugin-jsx-a11y` | moderate | Development tooling only | npm install eslint-config-next@0.2.4 (breaking; compatibility review) |  |
| frontend / `eslint-plugin-react` | moderate | Development tooling only | npm audit fix |  |
| frontend / `file-entry-cache` | moderate | Development tooling only | npm install eslint@4.0.0 (breaking; compatibility review) |  |
| frontend / `flat-cache` | moderate | Development tooling only | npm install eslint@4.0.0 (breaking; compatibility review) |  |
| frontend / `glob` | moderate | Development tooling only | npm install eslint@4.0.0 (breaking; compatibility review) |  |
| frontend / `minimatch` | moderate | Development tooling only | npm install eslint@4.0.0 (breaking; compatibility review) | https://github.com/advisories/GHSA-g3hv-75wg-m249 |
| frontend / `rimraf` | moderate | Development tooling only | npm install eslint@4.0.0 (breaking; compatibility review) |  |
| backend / `@google-cloud/firestore` | moderate | Production tree | npm install firebase-admin@14.5.0 (breaking; compatibility review) |  |
| backend / `@google-cloud/storage` | moderate | Production tree | npm install firebase-admin@14.5.0 (breaking; compatibility review) |  |
| backend / `firebase-admin` | moderate | Production tree | npm install firebase-admin@14.5.0 (breaking; compatibility review) |  |
| backend / `gaxios` | moderate | Production tree | npm audit fix |  |
| backend / `google-gax` | moderate | Production tree | npm install firebase-admin@14.5.0 (breaking; compatibility review) |  |
| backend / `minimatch` | moderate | Development tooling only | npm install nodemon@1.0.2 (breaking; compatibility review) | https://github.com/advisories/GHSA-g3hv-75wg-m249 |
| backend / `nodemon` | moderate | Development tooling only | npm install nodemon@1.0.2 (breaking; compatibility review) |  |
| backend / `retry-request` | moderate | Production tree | npm install firebase-admin@14.5.0 (breaking; compatibility review) |  |
| backend / `teeny-request` | moderate | Production tree | npm install firebase-admin@14.5.0 (breaking; compatibility review) |  |
| backend / `uuid` | moderate | Production tree | npm install firebase-admin@14.5.0 (breaking; compatibility review) | https://github.com/advisories/GHSA-w5hq-g745-h8pq |

The backend currently invokes Firebase Realtime Database, not Firestore or Cloud Storage. Moderate packages are installed through those SDK dependency branches; this narrows current use but is not proof of non-exploitability. A Firebase Admin major upgrade requires emulator and real credential verification beyond the isolated tests. Development ESLint/nodemon findings affect local/CI tooling, not the production dependency installation. Do not blindly apply audit-suggested downgrades (e.g. ESLint 4); migrate the lint stack deliberately.

## Product limits

- Firmware compilation, physical sensors/relay/camera, live Firebase rules and migration are unverified; see MANUAL_STEPS.md.
- Accounts are not yet tenant/site-isolated, OTP is not implemented, and sessions still use the existing JWT mechanism. Phase 2 must resolve this before launch.
- Unaggregated history has a 50,000-row safety ceiling; large reporting periods require aggregation.
- Coating, CV, relay commands, persistent maintenance, reports and commerce remain unavailable pending later phases. No release-candidate status is implied.

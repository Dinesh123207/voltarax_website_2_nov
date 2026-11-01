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


## Phase 2 current audit disposition (supersedes earlier counts)

Production remains frontend 0 and backend 8 moderate; neither has high/critical findings. The backend full tree now has 21 moderate and no high/critical findings. Emulator tooling introduced five inherited high matches through the Firestore test client; non-breaking audit fix could not patch its pinned gRPC. A scoped @firebase/firestore override to @grpc/grpc-js 1.14.7 removed them without downgrading Firebase. Full/production evidence is saved under test-results/.

| Backend package | Severity | Exposure | Audit suggested fix (review required) | Direct advisory |
| --- | --- | --- | --- | --- |
| `@google-cloud/firestore` | moderate | Included in production SDK tree; see RTDB reachability note above | firebase-admin@14.5.0 (breaking) |  |
| `@google-cloud/pubsub` | moderate | Development/emulator tooling only | firebase-tools@3.18.2 (breaking) |  |
| `@google-cloud/storage` | moderate | Included in production SDK tree; see RTDB reachability note above | firebase-admin@14.5.0 (breaking) |  |
| `@opentelemetry/core` | moderate | Development/emulator tooling only | firebase-tools@3.18.2 (breaking) | https://github.com/advisories/GHSA-8988-4f7v-96qf |
| `archiver` | moderate | Development/emulator tooling only | firebase-tools@3.18.2 (breaking) |  |
| `archiver-utils` | moderate | Development/emulator tooling only | firebase-tools@3.18.2 (breaking) |  |
| `exegesis` | moderate | Development/emulator tooling only | npm audit fix |  |
| `firebase-admin` | moderate | Included in production SDK tree; see RTDB reachability note above | firebase-admin@14.5.0 (breaking) |  |
| `firebase-tools` | moderate | Development/emulator tooling only | firebase-tools@3.18.2 (breaking) |  |
| `gaxios` | moderate | Included in production SDK tree; see RTDB reachability note above | firebase-tools@3.18.2 (breaking) |  |
| `glob` | moderate | Development/emulator tooling only | firebase-tools@3.18.2 (breaking) | https://github.com/advisories/GHSA-3g3m-2fjr-6pw4 |
| `google-gax` | moderate | Included in production SDK tree; see RTDB reachability note above | firebase-admin@14.5.0 (breaking) |  |
| `minimatch` | moderate | Development/emulator tooling only | nodemon@1.0.2 (breaking) | https://github.com/advisories/GHSA-g3hv-75wg-m249 |
| `nodemon` | moderate | Development/emulator tooling only | nodemon@1.0.2 (breaking) |  |
| `readdir-glob` | moderate | Development/emulator tooling only | firebase-tools@3.18.2 (breaking) |  |
| `retry-request` | moderate | Included in production SDK tree; see RTDB reachability note above | firebase-admin@14.5.0 (breaking) |  |
| `rimraf` | moderate | Development/emulator tooling only | firebase-admin@14.5.0 (breaking) |  |
| `superstatic` | moderate | Development/emulator tooling only | firebase-tools@3.18.2 (breaking) |  |
| `teeny-request` | moderate | Included in production SDK tree; see RTDB reachability note above | firebase-admin@14.5.0 (breaking) |  |
| `uuid` | moderate | Included in production SDK tree; see RTDB reachability note above | firebase-tools@3.18.2 (breaking) | https://github.com/advisories/GHSA-w5hq-g745-h8pq |
| `zip-stream` | moderate | Development/emulator tooling only | npm audit fix |  |

Do not apply the suggested Firebase/test-tooling/CLI downgrades blindly. Production uses npm ci --omit=dev. Review major SDK upgrades against the emulator and actual configured project before deployment. Frontend CSP permits inline scripts/styles for current Next.js rendering; tightening it needs a nonce/rendering change. SMTP delivery, shared Redis, hardware and target-host cookies remain unverified.

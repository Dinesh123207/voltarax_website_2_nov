# AI engine

This Python project evaluates telemetry and estimates power at the current
timestamp. Future weather, confidence intervals, confirmed fault classification
and real-site accuracy are unavailable. Network reads and publication default
off. Connecting hardware alone does not start a scheduled process.

## Setup and tests

Use Python 3.13 (3.13.15 tested), from this directory:

~~~powershell
python -m venv ../../.local-tools/ai-python
& ../../.local-tools/ai-python/Scripts/python.exe -m pip install --only-binary=:all: -r requirements.lock.txt
& ../../.local-tools/ai-python/Scripts/python.exe -m pytest tests -q -p no:cacheprovider
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
~~~

On Linux create the environment with python3.13 and use its bin/python.
Tests inject generated inputs/fake writers; the separately guarded
ai_emulator_check.py uses only the localhost demo SDK. No global changes.

## Data and validation

Read bounded primary-device /readings/{site} records, with legacy
/solar_site/history compatibility for the default site. Check sensor flags,
identity, finite ranges and timestamps. Missing sensors do not become zero or
25 C. Features use IST. Inputs expire after 120 seconds and models after
30 days by default, with bounded configuration overrides.

Power uses the oldest 80% for training, newest 20% for validation (at least
100 complete daylight rows, 50 training and 20 validation). Optional feature
medians use training rows only; entirely missing training columns are excluded.
The saved estimator is not refitted on validation rows. MAE/RMSE are mW;
R2 is null for a constant target. The comparator uses training-only performance
ratio and configured panel/lux/temperature assumptions. Candidates need finite
errors, R2 >= 0 when defined, and RMSE no more than 5% above the comparator.
This is an acceptance policy, not an accuracy guarantee. Calibration requires
physical review.

Isolation Forest marks unusual patterns, not confirmed faults. Only recorded
anomaly_label bool/0/1 labels support held-out precision/recall proxies;
undefined metrics are null. The health baseline is a clipped historical
engineering reference, not physical health or coating condition. Dark inputs
do not produce daylight power/anomaly estimates.

## Offline evaluation

~~~powershell
python scripts/evaluate_export.py --input PRIVATE_EXPORT.json --output artifacts/evaluations/REVIEWED_PERIOD.json
~~~

No Firebase connection is made. JSON map/list/per-site/legacy export or CSV
must contain matching site/device identities; capped at 20 MB and
AI_MAX_HISTORY_ROWS. Keep raw exports private, outside Git. Output is limited
to artifacts or workspace docs/test-results and refuses overwrite; it contains
metrics/counts/input hash, not raw rows. Use --synthetic for generated inputs;
simulated flags are detected. Only synthetic evaluation was performed in this
run. It establishes no field accuracy.

## Artifacts and publication

Validated artifacts are versioned under artifacts/validated/{site}/{device}/
{data-origin}/{model}. Immutable model/metadata files are SHA-256-bound by an
atomic current.json manifest; an OS writer lock prevents overlapping saves.
Older source windows cannot replace newer candidates. Synthetic artifacts
cannot replace device-history manifests. Load checks schema, site/device,
training parameters, exact library versions, age and hashes before joblib
deserialization. Old unverified .joblib files are preserved without loading.
Hashes detect corruption, not malicious replacement of the complete manifest:
only the trusted engine account may write the private artifact directory.
Never import untrusted artifacts. Prior versions remain for operator-reviewed
retention/rollback; none are deleted.

Results are schema-validated before publication to
/sites/{site}/ai/{forecast,anomaly,health,status}, including source time, model
version/training/validation and origin. No stale number is republished as fresh.
Inference refreshes bounded latest input after training. Readiness counts
eligible new timestamps in a sliding window.

AI_REMOTE_ACCESS_ENABLED and AI_PUBLISH_ENABLED default false. Synthetic
publication requires an explicitly identified loopback demo emulator.
See scripts/schedule_cron.md and ../../docs/MANUAL_STEPS.md before operator
setup. Real credentials/data/weather validation remain manual checks.

## Distribution shift and retraining

scripts/check_drift.py --input PRIVATE_EXPORT.json --output artifacts/drift/REVIEW.json
is offline and never writes to Firebase. Without --input it requires explicitly
configured reads. --publish separately enables schema-validated /sites/{site}/ai/drift
publication, and cannot be combined with an offline input. Missing models or
references remain unavailable; outputs refuse overwrites.

Reference light/temperature quantile histograms come only from actual training
inputs (forecast holdout excluded). PSI compares at most 500 eligible rows newer
than the previous source-window watermark, requiring 50 rows. Half-count
smoothing handles constant/empty bins without infinity. The 0.2 review threshold
is an initial assumption, not a validated site threshold or accuracy/fault test.
Drift requests review; it does not bypass minimum new rows or the chronological
candidate acceptance gate. Reports identify the evaluated model version and
training/source window. No drift result was verified on real-site data.

## Container and final verification
The pinned Python image runs predict_once.py as a batch job, not a fabricated HTTP service. Persist only reviewed artifacts at /srv/artifacts and use separate least-privilege AI_FIREBASE_* root Compose credentials. Both network/publication flags stay off by default. Full stack/scheduling/recovery steps are in ../../docs/RELEASE_OPERATIONS.md; actual image/runtime, real inputs/accuracy and live schedules remain unverified. The final local regression suite has 28 passing tests; consult FINAL_REPORT.md/PROGRESS.md for the complete gate and evidence paths. No weather-ahead forecasting or deployment is implied.

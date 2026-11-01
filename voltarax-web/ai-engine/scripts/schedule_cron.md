# Operator scheduling guide (not executed)

Complete Phase 6 and non-production service checks in MANUAL_STEPS.md first.
Install requirements.lock.txt in private Python 3.13; review site/device IDs,
physical assumptions, least-privilege credentials and artifact permissions.
Never use synthetic fixtures remotely.

Network reads require AI_REMOTE_ACCESS_ENABLED=true; publication separately
requires AI_PUBLISH_ENABLED=true. Both default false. Configure only in the
operator-selected non-production environment, not during this test-only run.

Schedule scripts/predict_once.py every minute for bounded latest reads,
validated unexpired artifacts and current estimates or unavailable reasons.
Schedule scripts/run_once.py hourly for bounded history, eligible new-row
checks, chronological validation, atomic save and newly fetched current input.
Do not overlap runs of the same task; cap each at ten minutes. Failed/expired
models remain Unavailable until a valid candidate exists. Missing, bad, stale
or dark inputs do not become daylight predictions.

Immediately before hourly training, schedule scripts/check_drift.py --publish
in the same explicit test configuration. Keep its restricted log/JSON review
record alongside model versions. This evaluates the previous model reference
before replacement. At least 50 new eligible samples are needed for drift;
retraining still waits for AI_MIN_NEW_ROWS_TO_RETRAIN (100 default) and all
model quality gates. Missing references and stale inputs remain unavailable.

For cron/systemd set working directory to ai-engine and use absolute
environment bin/python. For Task Scheduler use absolute Scripts/python.exe,
matching Start in, one instance, ten-minute stop limit. Capture restricted
rotating logs without credentials or raw telemetry. No live schedule is enabled.

Readiness counts eligible timestamps beyond the previous source window, not a
difference in window size. Review validation/drift and calibration before
site claims. No schedule, real-site accuracy or weather provider was verified.

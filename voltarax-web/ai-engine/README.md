# AI Engine

A separate Python project that trains on your panel's own history and
publishes predictions back to Firebase for the website/dashboard to read.
It does not run as a server — it's a script you schedule (see
`scripts/schedule_cron.md`), because a solar panel's conditions change on
the order of minutes, not milliseconds; there's nothing for an always-on
process to do between runs.

```
ai-engine/
├── config.py                 # every threshold and Firebase setting, in one file
├── data/
│   ├── schema.py              # the structured telemetry contract (see below)
│   ├── ingest.py              # Firebase -> structured pandas DataFrame
│   └── features.py            # shared feature engineering
├── models/
│   ├── base.py                 # common save/load/metadata interface
│   ├── forecast/gradient_boosting_forecaster.py
│   ├── anomaly/isolation_forest_detector.py
│   └── health/performance_ratio_model.py
├── pipeline/
│   ├── readiness.py            # "is there enough new data to (re)train?"
│   ├── orchestrator.py         # the automation entrypoint — see below
│   └── publish.py              # writes results to /solar_site/ai/*
├── scripts/
│   ├── run_once.py             # what you actually put in cron
│   └── schedule_cron.md
└── tests/test_pipeline_synthetic.py   # proves all of the above works, with no
                                        # hardware and no real Firebase project
```

## The structured data contract

Every row the AI engine trains on has this shape (`data/schema.py`), which
is exactly what `backend/README-FIREBASE.md` and `hardware/README.md`
already define for `/solar_site/history/<pushId>`:

```
ts, device_id, site_id, voltage_v, current_ma, power_mw, light_lux,
temp_c, humidity_pct, dust_ugm3, rssi, uptime_s,
sensors_ok_ina219, sensors_ok_bh1750, sensors_ok_dht11, sensors_ok_dust
```

One format, three producers, one consumer: the NodeMCU (writing directly),
the Node backend's `/api/telemetry/ingest` bridge, and this AI engine all
agree on it — nobody has to reshape data for anybody else.

## The automation pipeline

`pipeline/orchestrator.py` is the whole automation loop:

```
fetch /solar_site/history from Firebase
  -> for each model (forecast, anomaly, health baseline):
       enough new data since last training? (pipeline/readiness.py)
         yes -> train, save to artifacts/, record how many rows and when
         no  -> keep using whatever was last trained, or stay "not enough data"
  -> predict from the latest reading
  -> publish to /solar_site/ai/{forecast,anomaly,health,status}
```

**This is what "starts training automatically once hardware is connected"
means, concretely**: nothing about this pipeline changes when real sensor
data starts arriving. Today, with zero hardware connected,
`config.MIN_DAYLIGHT_ROWS_FORECAST` etc. are never met, so every scheduled
run publishes `{"status": "not_enough_data", "reason": "waiting for
hardware data (0/300)"}` — which `backend/routes/voltvision.js` reads and
falls back to its existing rule-based baseline, exactly as it does right
now. The first run where a threshold is crossed, that model trains and
starts publishing real numbers. No redeploy, no flag to flip, no second
system to wire up later — same cron job, same script, from day one.

`tests/test_pipeline_synthetic.py` proves this hand-off with synthetic
data standing in for real hardware history: not-enough-data behaviour,
successful training once thresholds are met, a trained forecaster that
actually tracks daylight instead of predicting a flat average, a trained
anomaly detector that actually catches a simulated wiring fault, and that
an hourly cron doesn't retrain on every tick once a model is already
trained on recent data.

## Model scope and validation

The gradient-boosting regressor estimates power at the **current timestamp**
from environmental/time features. It is not a weather-ahead forecast.
Isolation Forest flags unusual patterns without a verified fault taxonomy.
The performance-ratio reference is a clipped training-history percentile,
not proof of a healthy panel or measured coating condition. No validated
confidence interval or real-site accuracy is established.

Power evaluation uses an oldest-80% / newest-20% chronological holdout,
with at least 100 complete daylight rows and 20 validation rows. Optional
feature medians are fitted on the training rows only; entirely missing
training features are excluded. Required power/light/temperature, failed
sensor flags, nonfinite/out-of-range inputs and source identities are checked.
Time-of-day features use IST. MAE/RMSE use milliwatts; R2 is unavailable for
a constant target. A training-only engineering performance-ratio baseline
uses the configured panel/lux/temperature assumptions, which need physical
review. A candidate must have finite errors, nonnegative R2 when defined and
RMSE at most 5% above that baseline. This is an explicit acceptance policy,
not an accuracy guarantee. The held-out rows are never refitted into the
candidate, so the reported metrics describe the actual saved model.

Optional `anomaly_label` is a recorded boolean (or 0/1), never a label inferred
from the detector. Precision/recall proxies use only labelled held-out rows;
missing/undefined metrics remain Unavailable. Labels themselves still require
operator verification. Synthetic test results must not become site claims.

## Offline export evaluation

No Firebase account or network request is needed by this command:

```powershell
python scripts/evaluate_export.py --input PATH_TO_PRIVATE_EXPORT.json --output artifacts/evaluations/REVIEWED_PERIOD.json
```

It accepts a bounded local JSON map/list, per-site readings export, legacy
solar_site/history export or CSV with explicit matching site/device IDs. Input
is capped at 20 MB / AI_MAX_HISTORY_ROWS. Use a private export outside Git.
Output is limited to artifacts or workspace docs/test-results and refuses to
overwrite an existing file. It contains metrics/counts/input hash, not raw rows.
Use --synthetic for generated inputs; marked simulated readings are detected
automatically. No real exported dataset was supplied or evaluated in this run.

The active Phase 6 publication/freshness/drift work is tracked in
../../docs/PROGRESS.md. Do not schedule the existing Firebase-writing entrypoint
until that gate and the separate non-production service checks are complete.

## Setup

Use Python 3.13 (3.13.15 was tested). From this directory on Windows:

```powershell
python -m venv ../../.local-tools/ai-python
& ../../.local-tools/ai-python/Scripts/python.exe -m pip install --only-binary=:all: -r requirements.lock.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

On Linux use python3.13 to create the same isolated environment and its
bin/python executable for installation/tests. The lock file records the actual
verified environment; no system Python changes are required. Real Firebase
configuration and scheduling are separate operator steps after Phase 6's gate.
Do not run scripts/run_once.py against a live project during this test-only run.

## Running the tests

```powershell
& ../../.local-tools/ai-python/Scripts/python.exe -m pytest tests -q -p no:cacheprovider
```

No Firebase project or hardware required — every test generates its own
synthetic telemetry (a realistic day/night power curve with sensor noise)
and injects it in place of a real Firebase read.

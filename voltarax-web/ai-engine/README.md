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

## Model choices, and why

- **Forecast — Gradient Boosting Regressor** over light/temperature/
  humidity/dust/time-of-day. Tree ensembles (Random Forest, Gradient
  Boosting, XGBoost) are repeatedly reported as strong, fast-to-train
  baselines for short-term PV power regression from environmental sensor
  features, ahead of KNN and comparable to deep models at this data scale:
  a 2026 tilt-angle PV study found Gradient Boosting ahead of Random Forest
  and KNN; a 2024 Australian rooftop-PV study found Random Forest the top
  regressor among several tested; a broader RF/XGBoost/LSTM comparison
  (arXiv:2509.24059) reports irradiance as the dominant feature across
  methods, which is exactly why `light_lux` carries most of the weight
  here. GBR was picked over Random Forest specifically because more than
  one of these found it slightly ahead — swap it in `models/forecast/` if
  your own validation MAE (recorded in every model's metadata) says
  otherwise for your panel.
  **Caveat stated plainly, not glossed over**: without a weather forecast
  feed, this predicts power from *current* conditions, not a true N-hours-
  ahead forecast. "1h/6h/24h/7d" in the dashboard today are that same
  estimate scaled up — real ahead-of-time forecasting needs either a
  weather API integration or a proper time-series model (LSTM/temporal
  transformer) once there's enough history to train one; that's a
  documented next step, not a claim this version already makes.
- **Anomaly detection — Isolation Forest**, unchanged in technique from
  `hardware/raspberry-pi/train_model.py`, just formalized into the shared
  pipeline and published to Firebase so the *web* dashboard sees it too
  (previously only the local Pi touchscreen did). Isolation Forest needs no
  labelled fault examples — appropriate here since nobody has any yet — and
  isolates outliers by how few random splits it takes to separate a point,
  which is a good match for "flag anything unusual" with no fault taxonomy
  defined up front.
- **Health baseline — an adaptive percentile, deliberately not a trained
  model.** `hardware/raspberry-pi/analysis.py` asks you to eyeball a few
  clear days and hand-set `BASELINE_PR`. This computes the 90th-percentile
  performance ratio from the panel's own recent daylight readings instead —
  self-correcting for local shading, tilt and wiring losses. It's kept
  unsupervised on purpose: nobody has "this reading was truly healthy"
  ground truth to train a classifier or regressor against, so pretending to
  fit one would be manufacturing rigour the data doesn't support. A robust
  statistic of the panel's own good days is the honest amount of "learning"
  available data can carry — replacing a manually-typed guess with a
  number computed from data, not adding a second guess dressed up as ML.

## Setup

```bash
cd ai-engine
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # same Firebase project as backend/.env
python scripts/run_once.py
```

Then schedule it — see `scripts/schedule_cron.md`.

## Running the tests

```bash
cd ai-engine && source .venv/bin/activate && pytest tests/ -v
```

No Firebase project or hardware required — every test generates its own
synthetic telemetry (a realistic day/night power curve with sensor noise)
and injects it in place of a real Firebase read.

"""
Pulls /solar_site/history from Firebase and returns a structured pandas
DataFrame matching data/schema.py. This is the ONLY place that talks to
Firebase for reading; everything downstream (features, models) works on
plain DataFrames and has no idea Firebase exists — which is also what makes
tests/test_pipeline_synthetic.py possible without real credentials.

Design choice worth calling out: malformed or partial rows (a sensor that
was briefly offline) are kept, with missing fields as NaN — never filled
with an invented value. Each model decides for itself how to handle NaNs
(see models/*), rather than this module silently making that call for
everyone.
"""
import json
import logging
from typing import Callable, Optional

import pandas as pd
import numpy as np

import config as cfg
from data.schema import TELEMETRY_COLUMNS

log = logging.getLogger("ai_engine.ingest")

_app = None


def _binary_label(value):
    if isinstance(value, (bool, np.bool_)):
        return bool(value)
    if isinstance(value, (int, float, np.integer, np.floating)) and np.isfinite(value) and value in (0, 1):
        return bool(value)
    return None


def _get_firebase_app():
    """Lazy singleton so importing this module never requires credentials
    (needed for tests and for `--dry-run` style CLI usage)."""
    global _app
    if _app is not None:
        return _app
    import firebase_admin
    from firebase_admin import credentials

    if firebase_admin._apps:
        _app = firebase_admin.get_app()
        return _app

    if not cfg.FIREBASE_DATABASE_URL:
        raise RuntimeError(
            "FIREBASE_DATABASE_URL is not set. Copy ai-engine/.env.example to "
            "ai-engine/.env and fill it in — see ai-engine/README.md."
        )

    if cfg.FIREBASE_SERVICE_ACCOUNT_JSON:
        cred = credentials.Certificate(json.loads(cfg.FIREBASE_SERVICE_ACCOUNT_JSON))
    elif cfg.FIREBASE_SERVICE_ACCOUNT_FILE:
        cred = credentials.Certificate(cfg.FIREBASE_SERVICE_ACCOUNT_FILE)
    else:
        raise RuntimeError(
            "No Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_FILE or "
            "FIREBASE_SERVICE_ACCOUNT_JSON in ai-engine/.env — same service "
            "account key used by backend/.env works here."
        )

    _app = firebase_admin.initialize_app(
        cred, {"databaseURL": cfg.FIREBASE_DATABASE_URL}, name="ai-engine"
    )
    return _app


def _default_reader() -> dict:
    """Reads the raw /solar_site/history subtree from real Firebase."""
    from firebase_admin import db

    app = _get_firebase_app()
    current = db.reference(f"/readings/{cfg.SITE_ID}", app=app).order_by_child('ts').limit_to_last(cfg.MAX_HISTORY_ROWS).get() or {}
    migrated = db.reference(f"/migrations/site_history/{cfg.SITE_ID}/complete", app=app).get() is True
    legacy = {} if migrated else (db.reference('/solar_site/history', app=app).order_by_child('ts').limit_to_last(cfg.MAX_HISTORY_ROWS + 1).get() or {})
    if len(legacy) > cfg.MAX_HISTORY_ROWS:
        raise RuntimeError('Legacy history exceeds safe compatibility window; migrate and verify per-site history before training')
    merged = {}
    for key, row in {**legacy, **current}.items():
        if isinstance(row, dict) and row.get('site_id', 'solar_site') == cfg.SITE_ID and row.get('device_id') == cfg.DEVICE_ID:
            merged[(row.get('device_id', ''), row.get('ts'))] = (key, row)
    return dict(merged.values())


def raw_history_to_frame(raw: dict) -> pd.DataFrame:
    """Turns the {pushId: {..fields..}} shape Firebase returns into a
    structured, typed DataFrame. Pure function — no I/O — so it's the same
    code path whether `raw` came from real Firebase or a synthetic fixture."""
    if not raw:
        return pd.DataFrame(columns=list(TELEMETRY_COLUMNS.keys()))

    rows = []
    for push_id, row in raw.items():
        if not isinstance(row, dict) or "ts" not in row:
            log.warning("Skipping malformed history row")
            continue
        if isinstance(row.get('ts'), (bool, np.bool_)):
            continue
        if row.get('site_id', cfg.SITE_ID) != cfg.SITE_ID or row.get('device_id', cfg.DEVICE_ID) != cfg.DEVICE_ID:
            continue
        sensors_ok = row.get("sensors_ok") if isinstance(row.get('sensors_ok'), dict) else {}
        rows.append({
            "ts": row.get("ts"),
            "device_id": row.get("device_id"),
            "site_id": row.get("site_id", cfg.SITE_ID),
            "voltage_v": row.get("voltage_v"),
            "current_ma": row.get("current_ma"),
            "power_mw": row.get("power_mw"),
            "light_lux": row.get("light_lux"),
            "temp_c": row.get("temp_c"),
            "humidity_pct": row.get("humidity_pct"),
            "dust_ugm3": row.get("dust_ugm3"),
            "rssi": row.get("rssi"),
            "uptime_s": row.get("uptime_s"),
            "sensors_ok_ina219": sensors_ok.get("ina219", row.get('sensors_ok_ina219')),
            "sensors_ok_bh1750": sensors_ok.get("bh1750", row.get('sensors_ok_bh1750')),
            "sensors_ok_dht11": sensors_ok.get("dht11", row.get('sensors_ok_dht11')),
            "sensors_ok_dust": sensors_ok.get("dust", row.get('sensors_ok_dust')),
            'simulated': row.get('simulated') is True,
            'anomaly_label': _binary_label(row.get('anomaly_label')),
        })

    df = pd.DataFrame(rows)
    if df.empty:
        return pd.DataFrame(columns=list(TELEMETRY_COLUMNS.keys()))

    df["ts"] = pd.to_numeric(df["ts"], errors="coerce")
    df = df[np.isfinite(df['ts']) & (df['ts'] > 0) & (df['ts'] < 4102444800) & (df['ts'] % 1 == 0)].copy()
    df["ts"] = df["ts"].astype("int64")
    for col in ["voltage_v", "current_ma", "power_mw", "light_lux", "temp_c",
                "humidity_pct", "dust_ugm3", "rssi", "uptime_s"]:
        df[col] = pd.to_numeric(df[col].map(lambda value: np.nan if isinstance(value, (bool, np.bool_)) else value), errors="coerce").replace([np.inf, -np.inf], np.nan)
    bounds = {'voltage_v': (0, 1000), 'current_ma': (0, 1e9), 'power_mw': (0, 1e12), 'light_lux': (0, 200000),
              'temp_c': (-50, 150), 'humidity_pct': (0, 100), 'dust_ugm3': (0, 1e6), 'rssi': (-150, 0), 'uptime_s': (0, float('inf'))}
    for column, (low, high) in bounds.items():
        df[column] = df[column].where(df[column].between(low, high))
    sensor_fields = {'ina219': ['power_mw', 'current_ma', 'voltage_v'], 'bh1750': ['light_lux'], 'dht11': ['temp_c', 'humidity_pct'], 'dust': ['dust_ugm3']}
    for sensor, columns in sensor_fields.items():
        flag = 'sensors_ok_' + sensor
        df[flag] = df[flag].map(lambda value: bool(value) if isinstance(value, (bool, np.bool_)) else None).astype('boolean')
        df.loc[df[flag].eq(False).fillna(False), columns] = np.nan
    df['anomaly_label'] = df['anomaly_label'].astype('boolean')
    df = df.sort_values("ts").drop_duplicates(subset=["ts"]).reset_index(drop=True)
    return df


def fetch_history(reader: Optional[Callable[[], dict]] = None,
                   max_rows: int = cfg.MAX_HISTORY_ROWS) -> pd.DataFrame:
    """
    reader: injected for tests (see tests/test_pipeline_synthetic.py). Defaults
    to a real Firebase read. Returns rows sorted oldest -> newest, capped at
    max_rows most recent to bound memory/training time as history grows.
    """
    raw = (reader or _default_reader)()
    df = raw_history_to_frame(raw)
    df = df[(df['site_id'] == cfg.SITE_ID) & (df['device_id'] == cfg.DEVICE_ID)].copy()
    if len(df) > max_rows:
        df = df.tail(max_rows).reset_index(drop=True)
    return df

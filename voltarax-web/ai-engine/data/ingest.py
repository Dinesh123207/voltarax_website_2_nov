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

import config as cfg
from data.schema import TELEMETRY_COLUMNS

log = logging.getLogger("ai_engine.ingest")

_app = None


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
    ref = db.reference(f"/{cfg.SITE_ID}/history", app=app)
    return ref.get() or {}


def raw_history_to_frame(raw: dict) -> pd.DataFrame:
    """Turns the {pushId: {..fields..}} shape Firebase returns into a
    structured, typed DataFrame. Pure function — no I/O — so it's the same
    code path whether `raw` came from real Firebase or a synthetic fixture."""
    if not raw:
        return pd.DataFrame(columns=list(TELEMETRY_COLUMNS.keys()))

    rows = []
    for push_id, row in raw.items():
        if not isinstance(row, dict) or "ts" not in row:
            log.warning("Skipping malformed history row %s", push_id)
            continue
        sensors_ok = row.get("sensors_ok") or {}
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
            "sensors_ok_ina219": sensors_ok.get("ina219"),
            "sensors_ok_bh1750": sensors_ok.get("bh1750"),
            "sensors_ok_dht11": sensors_ok.get("dht11"),
            "sensors_ok_dust": sensors_ok.get("dust"),
        })

    df = pd.DataFrame(rows)
    if df.empty:
        return pd.DataFrame(columns=list(TELEMETRY_COLUMNS.keys()))

    df["ts"] = pd.to_numeric(df["ts"], errors="coerce")
    df = df.dropna(subset=["ts"]).copy()
    df["ts"] = df["ts"].astype("int64")
    for col in ["voltage_v", "current_ma", "power_mw", "light_lux", "temp_c",
                "humidity_pct", "dust_ugm3", "rssi", "uptime_s"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
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
    if len(df) > max_rows:
        df = df.tail(max_rows).reset_index(drop=True)
    return df

"""
"Is there enough data yet, and has enough changed since we last trained?"
— kept separate from orchestrator.py so it's independently testable and so
the thresholds it applies are all in one obvious place (config.py).
"""
from dataclasses import dataclass

import pandas as pd

import config as cfg
from data.features import daylight_only, build_forecast_dataset, build_anomaly_dataset


@dataclass
class Readiness:
    ready: bool
    reason: str
    total_rows: int
    daylight_rows: int


def check(df: pd.DataFrame, model, min_total_rows: int, min_daylight_rows: int) -> Readiness:
    total = len(df)
    if model.name == 'forecast_gbr':
        eligible = df.loc[build_forecast_dataset(df)[0].index] if total else df
    elif model.name == 'anomaly_isolation_forest':
        eligible = df.loc[build_anomaly_dataset(df).index] if total else df
    else:
        from models.health.performance_ratio_model import _performance_ratio
        eligible = df.loc[_performance_ratio(daylight_only(df)).index] if total else df
    daylight = len(eligible)

    if total < min_total_rows:
        return Readiness(False, f"waiting for hardware data ({total}/{min_total_rows} readings)", total, daylight)
    if daylight < min_daylight_rows:
        return Readiness(False, f"waiting for more daylight readings ({daylight}/{min_daylight_rows})", total, daylight)

    # Compare against how many rows EXISTED at last training time, not how many of
    # them survived this model's own filtering (rows_used) — those are different
    # units and comparing them makes the gate always look like a huge jump.
    watermark = (model.metadata or {}).get('source_window_end_ts', 0)
    new_rows = len(eligible[eligible['ts'] > watermark])
    if model.is_trained() and new_rows < cfg.MIN_NEW_ROWS_TO_RETRAIN:
        return Readiness(False, f"already trained on recent data ({new_rows} new daylight rows)", total, daylight)

    return Readiness(True, "ready to train", total, daylight)

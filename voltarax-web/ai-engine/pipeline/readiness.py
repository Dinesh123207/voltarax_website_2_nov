"""
"Is there enough data yet, and has enough changed since we last trained?"
— kept separate from orchestrator.py so it's independently testable and so
the thresholds it applies are all in one obvious place (config.py).
"""
from dataclasses import dataclass

import pandas as pd

import config as cfg
from data.features import daylight_only


@dataclass
class Readiness:
    ready: bool
    reason: str
    total_rows: int
    daylight_rows: int


def check(df: pd.DataFrame, model, min_total_rows: int, min_daylight_rows: int) -> Readiness:
    total = len(df)
    daylight = len(daylight_only(df))

    if total < min_total_rows:
        return Readiness(False, f"waiting for hardware data ({total}/{min_total_rows} readings)", total, daylight)
    if daylight < min_daylight_rows:
        return Readiness(False, f"waiting for more daylight readings ({daylight}/{min_daylight_rows})", total, daylight)

    # Compare against how many rows EXISTED at last training time, not how many of
    # them survived this model's own filtering (rows_used) — those are different
    # units and comparing them makes the gate always look like a huge jump.
    last_total = (model.metadata or {}).get("total_rows_at_train", 0)
    if model.is_trained() and (total - last_total) < cfg.MIN_NEW_ROWS_TO_RETRAIN:
        return Readiness(False, f"already trained on recent data ({total - last_total} new rows)", total, daylight)

    return Readiness(True, "ready to train", total, daylight)

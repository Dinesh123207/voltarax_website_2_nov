"""
Writes results to /solar_site/ai/* in Firebase. This is the entire interface
between the AI engine and the rest of the system — the Node backend
(backend/services/aiPredictions.js) reads these same paths and falls back to
its existing rule-based baseline whenever `status` here isn't "ok". Neither
side needs to know the other exists beyond this shared path contract.
"""
import time
from typing import Callable, Optional

import config as cfg

AI_ROOT = lambda: f"/{cfg.SITE_ID}/ai"  # noqa: E731 - tiny, used in exactly two places


def _default_writer(path: str, value: dict):
    from firebase_admin import db
    from data.ingest import _get_firebase_app
    db.reference(path, app=_get_firebase_app()).set(value)


def publish(section: str, payload: dict, writer: Optional[Callable[[str, dict], None]] = None):
    """section: 'forecast' | 'anomaly' | 'health' | 'status'."""
    payload = {**payload, "updated_at": int(time.time())}
    (writer or _default_writer)(f"{AI_ROOT()}/{section}", payload)
    return payload


def not_enough_data(section: str, reason: str, readiness, writer=None):
    return publish(section, {
        "status": "not_enough_data",
        "reason": reason,
        "total_rows": readiness.total_rows,
        "daylight_rows": readiness.daylight_rows,
    }, writer)

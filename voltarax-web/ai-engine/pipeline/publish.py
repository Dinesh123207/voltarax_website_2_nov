"""Validate results before explicitly enabled canonical site-scoped publication."""
import time
from typing import Callable, Optional

import config as cfg
from pipeline.validation import validate_payload

AI_ROOT = lambda: f"/sites/{cfg.SITE_ID}/ai"


def _default_writer(path: str, value: dict):
    from pipeline.mode import require_remote_access, demo_emulator
    if not cfg.PUBLISH_ENABLED:
        raise RuntimeError('AI publication is disabled; use offline evaluation or explicitly configure test publication')
    require_remote_access()
    if value.get('data_origin') == 'synthetic-test-inputs' and not demo_emulator():
        raise RuntimeError('Synthetic publications require the isolated demo emulator')
    from firebase_admin import db
    from data.ingest import _get_firebase_app
    db.reference(path, app=_get_firebase_app()).set(value)


def publish(section: str, payload: dict, writer: Optional[Callable[[str, dict], None]] = None):
    """section: 'forecast' | 'anomaly' | 'health' | 'status'."""
    for key, expected in [('schema_version', 2), ('site_id', cfg.SITE_ID), ('device_id', cfg.DEVICE_ID)]:
        if key in payload and payload[key] != expected:
            raise ValueError('AI publication identity mismatch')
    payload = {**payload, 'schema_version': 2, 'site_id': cfg.SITE_ID, 'device_id': cfg.DEVICE_ID,
               'data_origin': payload.get('data_origin', 'device-history-unverified-calibration'),
               'dataQuality': 'Estimated' if payload.get('status') == 'ok' else 'Unavailable',
               "updated_at": int(time.time())}
    validate_payload(section, payload)
    (writer or _default_writer)(f"{AI_ROOT()}/{section}", payload)
    return payload


def not_enough_data(section: str, reason: str, readiness, writer=None):
    return publish(section, {
        "status": "not_enough_data",
        "reason": reason,
        "total_rows": readiness.total_rows,
        "daylight_rows": readiness.daylight_rows,
    }, writer)

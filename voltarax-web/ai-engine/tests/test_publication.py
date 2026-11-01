import sys
from pathlib import Path
import time

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config as cfg
from pipeline.publish import publish
from models.health.performance_ratio_model import HealthBaselineModel
from test_evaluation import sample_frame


def test_publication_validates_finite_source_origin_and_fields_before_any_transport(tmp_path, monkeypatch):
    monkeypatch.setattr(cfg, 'ARTIFACTS_DIR', tmp_path)
    frame = sample_frame(); frame['simulated'] = True
    model = HealthBaselineModel().fit(frame); model.save()
    source = int(time.time())
    payload = {'status': 'ok', 'source_ts': source, 'data_origin': 'synthetic-test-inputs', 'baseline_pr': model.baseline_pr(), 'model_metadata': model.metadata}
    writes = []; writer = lambda path, value: writes.append((path, value))
    result = publish('health', payload, writer)
    assert writes[0][0] == f'/sites/{cfg.SITE_ID}/ai/health'
    assert result['schema_version'] == 2 and result['dataQuality'] == 'Estimated'
    for patch in [{'baseline_pr': float('nan')}, {'source_ts': source - cfg.MAX_INPUT_AGE_SECONDS - 1},
                  {'site_id': 'foreign-site'}, {'private_field': 'synthetic-must-not-escape'}, {'data_origin': 'device-history-unverified-calibration'}]:
        with pytest.raises(ValueError):
            publish('health', {**payload, **patch}, writer)
    assert len(writes) == 1
    monkeypatch.setattr(cfg, 'PUBLISH_ENABLED', False)
    with pytest.raises(RuntimeError, match='disabled'):
        publish('health', payload)
    monkeypatch.setattr(cfg, 'PUBLISH_ENABLED', True); monkeypatch.setattr(cfg, 'REMOTE_ACCESS_ENABLED', True)
    monkeypatch.delenv('FIREBASE_DATABASE_EMULATOR_HOST', raising=False)
    with pytest.raises(RuntimeError, match='Synthetic'):
        publish('health', payload)


def test_stale_inputs_publish_unavailable_and_cannot_train_or_reuse_old_values(tmp_path, monkeypatch):
    monkeypatch.setattr(cfg, 'ARTIFACTS_DIR', tmp_path)
    from pipeline.orchestrator import run
    raw = {'old': {'site_id': cfg.SITE_ID, 'device_id': cfg.DEVICE_ID, 'ts': int(time.time()) - 3600,
                   'power_mw': 1000, 'light_lux': 40000, 'temp_c': 25, 'simulated': True}}
    writes = {}; result = run(reader=lambda: raw, writer=lambda path, value: writes.update({path: value}))
    assert not result.trained
    for section in ['forecast', 'anomaly', 'health']:
        value = writes[f'/sites/{cfg.SITE_ID}/ai/{section}']
        assert value['status'] == 'stale_input' and value['dataQuality'] == 'Unavailable'
        assert 'predicted_power_mw' not in value and 'baseline_pr' not in value


def test_retraining_watermark_detects_new_timestamps_in_a_fixed_size_window(tmp_path, monkeypatch):
    monkeypatch.setattr(cfg, 'ARTIFACTS_DIR', tmp_path)
    from pipeline.readiness import check
    frame = sample_frame()
    model = HealthBaselineModel().fit(frame)
    assert check(frame, model, 100, 10).ready is False
    rolling = frame.copy(); rolling['ts'] += 150 * 300
    assert len(rolling) == len(frame)
    assert check(rolling, model, 100, 10).ready is True


def test_night_inputs_are_not_scored_as_daylight_forecasts_or_faults(tmp_path, monkeypatch):
    monkeypatch.setattr(cfg, 'ARTIFACTS_DIR', tmp_path)
    from test_pipeline_synthetic import make_synthetic_history
    from pipeline.orchestrator import run
    raw = make_synthetic_history(days=10)
    clock = [max(row['ts'] for row in raw.values()) + 1]
    monkeypatch.setattr(time, 'time', lambda: clock[0])
    assert len(run(reader=lambda: raw, writer=lambda *_: None).trained) == 3
    latest = dict(max(raw.values(), key=lambda row: row['ts']))
    latest.update(ts=clock[0] + 300, power_mw=0, light_lux=0, current_ma=0)
    raw['dark-observation'] = latest; clock[0] = latest['ts'] + 1
    writes = {}; run(reader=lambda: raw, writer=lambda path, value: writes.update({path: value}))
    for section in ['forecast', 'anomaly']:
        value = writes[f'/sites/{cfg.SITE_ID}/ai/{section}']
        assert value['status'] == 'not_enough_daylight'
        assert 'predicted_power_mw' not in value and 'is_anomaly' not in value

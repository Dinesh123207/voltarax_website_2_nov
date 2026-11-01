import sys
from pathlib import Path
import json
import numpy as np
import pandas as pd
import pytest
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pipeline.drift import reference, assess, valid_reference
from test_evaluation import sample_frame


def test_distribution_shift_is_finite_and_does_not_claim_accuracy():
    frame = sample_frame(); ref = reference(frame)
    assert valid_reference(ref)
    metadata = {'drift_reference': ref, 'source_window_end_ts': int(frame.ts.max()), 'model_version': 'test-v2', 'trained_at': 1735689600}
    same = frame.copy(); same['ts'] += 864000
    stable = assess(same, metadata)
    assert stable['status'] == 'stable' and stable['max_psi'] == pytest.approx(0)
    changed = same.copy(); changed['light_lux'] *= 3
    shift = assess(changed, metadata)
    assert shift['status'] == 'drift_detected' and shift['max_psi'] > 0.2
    json.dumps(shift, allow_nan=False)
    assert assess(same.head(49), metadata)['status'] == 'insufficient_new_data'
    assert assess(frame, metadata)['recent_rows'] == 0


def test_forecast_reference_uses_only_training_inputs():
    from models.forecast.gradient_boosting_forecaster import ForecastModel
    frame = sample_frame(); frame.loc[320:, 'temp_c'] = 31
    model = ForecastModel().fit(frame)
    assert model.metadata['drift_reference'] == reference(frame.iloc[:320])
    assert model.metadata['drift_reference']['features']['temp_c']['cuts'] == [30.0]


def test_constant_missing_and_corrupt_references_stay_explicit():
    frame = pd.DataFrame({'ts': np.arange(100) + 1, 'light_lux': 50000.0, 'temp_c': 30.0})
    ref = reference(frame); assert valid_reference(ref)
    meta = {'drift_reference': ref, 'source_window_end_ts': 1, 'model_version': 'test-v2', 'trained_at': 1}
    result = assess(frame, meta)
    assert np.isfinite(result['max_psi'])
    assert assess(frame, {})['status'] == 'unavailable'
    assert assess(frame.assign(light_lux=np.nan), meta)['status'] == 'insufficient_new_data'
    invalid = json.loads(json.dumps(ref)); invalid['features']['temp_c']['cuts'] = [float('inf')]
    assert not valid_reference(invalid)


def test_drift_publication_is_validated_before_transport(monkeypatch):
    import time
    from scripts.check_drift import build_report
    from pipeline.publish import publish
    from models.health.performance_ratio_model import HealthBaselineModel
    frame = sample_frame(); frame['simulated'] = True
    frame['ts'] += int(time.time()) - int(frame['ts'].max()) - 864000
    model = HealthBaselineModel().fit(frame)
    current = frame.copy(); current['ts'] += 864000; current['light_lux'] *= 2
    monkeypatch.setattr(time, 'time', lambda: int(current['ts'].max()) + 1)
    report = build_report(current, models={'forecast': model, 'anomaly': model, 'health': model})
    sent = []
    value = publish('drift', report, writer=lambda *args: sent.append(args))
    assert len(sent) == 1 and value['models']['health']['status'] == 'drift_detected'
    invalid = json.loads(json.dumps(report)); invalid['models']['health']['max_psi'] = float('nan')
    with pytest.raises(ValueError):
        publish('drift', invalid, writer=lambda *args: sent.append(args))
    assert len(sent) == 1

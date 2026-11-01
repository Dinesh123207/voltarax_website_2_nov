import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from evaluation import fit_power, regression_metrics, anomaly_metrics
from data.features import BASE_FEATURE_COLUMNS, add_time_features


def sample_frame(rows=400):
    ts = 1735689600 + np.arange(rows) * 300
    light = 30000 + 20000 * (1 + np.sin(np.arange(rows) / 30))
    frame = pd.DataFrame({'ts': ts, 'light_lux': light, 'temp_c': 30.0,
                          'humidity_pct': 40.0, 'dust_ugm3': 30.0})
    import config as cfg
    irradiance = light / cfg.LUX_PER_WM2
    cell = 30 + (cfg.NOCT_C - 20) / 800 * irradiance
    frame['power_mw'] = cfg.PANEL_PMAX_W * irradiance * (1 + cfg.TEMP_COEFF * (cell - 25)) * 0.95
    return frame


def test_power_split_fits_imputation_only_on_past_training_rows():
    frame = sample_frame()
    frame.loc[:319, 'humidity_pct'] = np.nan
    frame.loc[0, 'humidity_pct'] = 10
    frame.loc[320:, 'humidity_pct'] = 100
    model, report, columns = fit_power(frame)
    assert report['split']['train_end_ts'] < report['split']['test_start_ts']
    assert model.named_steps['impute'].statistics_[columns.index('humidity_pct')] == 10
    assert set(report['model']) == {'mae_mw', 'rmse_mw', 'r2'}
    assert np.isfinite(report['baseline']['rmse_mw'])
    assert report['split']['method'] == 'chronological_holdout'


def test_constant_targets_and_missing_anomaly_labels_do_not_invent_accuracy():
    assert regression_metrics([1, 1, 1], [1, 1, 1])['r2'] is None
    assert anomaly_metrics([None, None], [True, False])['precision'] is None
    result = anomaly_metrics([True, False, True, False], [True, True, False, False])
    assert result['precision'] == 0.5 and result['recall'] == 0.5
    assert result['labelled_rows'] == 4


def test_training_rejects_tiny_or_incomplete_core_sensor_history():
    with pytest.raises(ValueError):
        fit_power(sample_frame(12))
    frame = sample_frame()
    frame['temp_c'] = np.nan
    with pytest.raises(ValueError):
        fit_power(frame)


def test_time_features_use_ist_and_do_not_include_the_power_target():
    frame = sample_frame(1)
    frame.loc[0, 'ts'] = pd.Timestamp('2026-10-31T18:30:00Z').timestamp()
    result = add_time_features(frame)
    assert abs(result.iloc[0]['hour_sin']) < 1e-10
    assert abs(result.iloc[0]['hour_cos'] - 1) < 1e-10
    assert 'power_mw' not in BASE_FEATURE_COLUMNS


def test_ingestion_discards_failed_boolean_nonfinite_and_foreign_measurements():
    from data.ingest import raw_history_to_frame
    import config as cfg
    row = {'ts': 1735689600, 'site_id': cfg.SITE_ID, 'device_id': cfg.DEVICE_ID, 'power_mw': 1000, 'light_lux': 30000, 'temp_c': 25}
    frame = raw_history_to_frame({'failed': {**row, 'sensors_ok': {'ina219': False}, 'humidity_pct': True, 'dust_ugm3': float('inf'), 'anomaly_label': True},
                                  'foreign': {**row, 'ts': row['ts'] + 1, 'site_id': 'another-site'},
                                  'bad-time': {**row, 'ts': float('inf')}})
    assert len(frame) == 1
    assert pd.isna(frame.iloc[0]['power_mw']) and pd.isna(frame.iloc[0]['humidity_pct']) and pd.isna(frame.iloc[0]['dust_ugm3'])
    assert bool(frame.iloc[0]['anomaly_label']) is True


def test_anomaly_proxy_uses_only_held_out_recorded_labels():
    from evaluation import evaluate_anomaly
    frame = sample_frame(500)
    frame['voltage_v'] = 12.0
    frame['current_ma'] = frame['power_mw'] / 12
    frame['anomaly_label'] = False
    frame.loc[490:, ['power_mw', 'current_ma']] = 0
    frame.loc[490:, 'anomaly_label'] = True
    result = evaluate_anomaly(frame)
    assert result['status'] == 'evaluated_label_proxy'
    assert result['train_end_ts'] < result['test_start_ts']
    assert result['labelled_rows'] == 100
    assert result['precision'] is not None and result['recall'] > 0

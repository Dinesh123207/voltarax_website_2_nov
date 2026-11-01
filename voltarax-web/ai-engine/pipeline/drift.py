"""Training-reference PSI heuristic. Distribution shift is not accuracy or a fault."""
import math
import numpy as np
import config as cfg
from data.features import build_forecast_dataset, build_anomaly_dataset, daylight_only

METHOD = 'psi-quantile-v1'
MINIMUM_ROWS = 50
THRESHOLD = 0.2  # Initial review policy, not a validated site threshold.
FIELDS = ('light_lux', 'temp_c')


def _complete(frame):
    if not all(field in frame for field in FIELDS):
        return frame.iloc[:0]
    return frame.replace([np.inf, -np.inf], np.nan).dropna(subset=list(FIELDS))


def _proportions(values, cuts):
    counts = np.histogram(values, bins=[-np.inf, *cuts, np.inf])[0]
    # Half-count smoothing keeps zero-count/constant-feature comparisons finite.
    return (counts + 0.5) / (len(values) + 0.5 * len(counts))


def reference(frame):
    complete = _complete(frame)
    features = {}
    if len(complete) >= MINIMUM_ROWS:
        for field in FIELDS:
            values = complete[field].to_numpy(dtype=float)
            cuts = np.unique(np.quantile(values, np.arange(0.1, 1.0, 0.1))).tolist()
            features[field] = {'cuts': cuts, 'proportions': _proportions(values, cuts).tolist(), 'rows': len(values)}
    return {'method': METHOD, 'minimum_rows': MINIMUM_ROWS, 'threshold': THRESHOLD, 'features': features}


def valid_reference(value):
    if not isinstance(value, dict) or set(value) != {'method', 'minimum_rows', 'threshold', 'features'}:
        return False
    if value['method'] != METHOD or value['minimum_rows'] != MINIMUM_ROWS or value['threshold'] != THRESHOLD or not isinstance(value['features'], dict) or set(value['features']) - set(FIELDS):
        return False
    for row in value['features'].values():
        if not isinstance(row, dict) or set(row) != {'cuts', 'proportions', 'rows'} or type(row['rows']) is not int or row['rows'] < MINIMUM_ROWS or row['rows'] > cfg.MAX_HISTORY_ROWS:
            return False
        cuts, props = row['cuts'], row['proportions']
        if not isinstance(cuts, list) or not 1 <= len(cuts) <= 9 or not all(type(number) in (int, float) and math.isfinite(number) for number in cuts) or cuts != sorted(set(cuts)):
            return False
        if not isinstance(props, list) or len(props) != len(cuts) + 1 or not all(type(number) in (int, float) and math.isfinite(number) and 0 < number <= 1 for number in props) or abs(sum(props) - 1) > 1e-6:
            return False
    return True


def eligible(frame, name):
    if name == 'forecast_gbr':
        return frame.loc[build_forecast_dataset(frame)[0].index]
    if name == 'anomaly_isolation_forest':
        return frame.loc[build_anomaly_dataset(frame).index]
    from models.health.performance_ratio_model import _performance_ratio
    return frame.loc[_performance_ratio(daylight_only(frame)).index]


def assess(frame, metadata):
    result = {'status': 'unavailable', 'model_version': metadata.get('model_version'), 'trained_at': metadata.get('trained_at'),
              'source_window_end_ts': metadata.get('source_window_end_ts'), 'recent_rows': None, 'max_psi': None, 'feature_psi': {}}
    ref = metadata.get('drift_reference')
    if not valid_reference(ref) or set(ref['features']) != set(FIELDS):
        return result
    recent = _complete(frame[frame['ts'] > metadata['source_window_end_ts']].sort_values('ts').tail(500))
    result['recent_rows'] = len(recent)
    if len(recent) < MINIMUM_ROWS:
        result['status'] = 'insufficient_new_data'; return result
    psi = {}
    for field, row in ref['features'].items():
        expected = np.asarray(row['proportions'])
        actual = _proportions(recent[field].to_numpy(dtype=float), row['cuts'])
        psi[field] = max(0.0, float(np.sum((actual - expected) * np.log(actual / expected))))
    maximum = max(psi.values())
    return {**result, 'status': 'drift_detected' if maximum >= THRESHOLD else 'stable', 'max_psi': maximum, 'feature_psi': psi}

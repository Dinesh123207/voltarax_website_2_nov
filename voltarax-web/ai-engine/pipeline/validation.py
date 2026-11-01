"""Finite schema/identity/clock checks shared by model storage and publication."""
import json
import math
import re
import time
import config as cfg

MODEL_NAMES = {'forecast_gbr', 'anomaly_isolation_forest', 'health_baseline'}
STATUSES = {'ok', 'not_enough_data', 'stale_input', 'invalid_input', 'model_expired', 'validation_failed', 'not_enough_daylight', 'model_unavailable'}
META_FIELDS = {'schema_version', 'model', 'site_id', 'device_id', 'model_version', 'trained_at', 'library_versions', 'training_parameters',
               'data_origin', 'source_window_end_ts', 'rows_used', 'total_rows_at_train', 'feature_columns', 'validation',
               'val_mae_mw', 'horizon_note', 'artifact_sha256', 'percentile', 'median_pr_observed', 'drift_reference'}


def training_parameters():
    return {'pmax_w': cfg.PANEL_PMAX_W, 'temp_coeff': cfg.TEMP_COEFF, 'noct_c': cfg.NOCT_C,
            'lux_per_wm2': cfg.LUX_PER_WM2, 'daylight_lux_threshold': cfg.DAYLIGHT_LUX_THRESHOLD,
            'feature_schema': 'current-conditions-ist-v2'}


def integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def valid_metadata(meta, name, now=None, check_age=True):
    now = int(time.time()) if now is None else now
    if not isinstance(meta, dict) or meta.get('schema_version') != 2 or meta.get('model') != name or name not in MODEL_NAMES:
        return False
    if set(meta) - META_FIELDS:
        return False
    from pipeline.drift import valid_reference
    if 'drift_reference' in meta and not valid_reference(meta['drift_reference']):
        return False
    if meta.get('site_id') != cfg.SITE_ID or meta.get('device_id') != cfg.DEVICE_ID or meta.get('training_parameters') != training_parameters():
        return False
    if not re.fullmatch(r'[A-Za-z0-9_.-]{3,128}', str(meta.get('model_version', ''))):
        return False
    stamp = meta.get('trained_at')
    source = meta.get('source_window_end_ts')
    if not integer(stamp) or stamp <= 0 or stamp > now + 300 or not integer(source) or source <= 0 or source > now + 300:
        return False
    if check_age and now - stamp > cfg.MAX_MODEL_AGE_SECONDS:
        return False
    if 'artifact_sha256' in meta and not re.fullmatch('[a-f0-9]{64}', str(meta['artifact_sha256'])):
        return False
    libraries = meta.get('library_versions')
    if not isinstance(libraries, dict) or set(libraries) != {'python', 'numpy', 'pandas', 'sklearn', 'joblib'} or not all(isinstance(value, str) and len(value) <= 64 for value in libraries.values()):
        return False
    if meta.get('data_origin') not in {'synthetic-test-inputs', 'device-history-unverified-calibration'}:
        return False
    if not integer(meta.get('rows_used')) or not integer(meta.get('total_rows_at_train')) or not 1 <= meta['rows_used'] <= meta['total_rows_at_train'] <= cfg.MAX_HISTORY_ROWS:
        return False
    validation = meta.get('validation')
    if not isinstance(validation, dict):
        return False
    allowed_validation = {'method_version', 'status', 'accepted', 'model', 'baseline', 'baseline_pr', 'baseline_method',
                          'acceptance_policy', 'split', 'feature_columns', 'imputation', 'horizon', 'units', 'precision', 'recall', 'note', 'physical_health'}
    if set(validation) - allowed_validation:
        return False
    if name == 'forecast_gbr':
        if validation.get('accepted') is not True or validation.get('status') != 'evaluated':
            return False
        for key in ['model', 'baseline']:
            metrics = validation.get(key, {})
            if not isinstance(metrics, dict) or not all(finite(metrics.get(field)) and metrics[field] >= 0 for field in ['mae_mw', 'rmse_mw']):
                return False
            if metrics.get('r2') is not None and (not finite(metrics['r2']) or metrics['r2'] > 1):
                return False
        split = validation.get('split', {})
        if not all(integer(split.get(field)) for field in ['train_rows', 'test_rows', 'train_end_ts', 'test_start_ts', 'test_end_ts']):
            return False
        if split['train_rows'] < 50 or split['test_rows'] < 20 or not split['train_end_ts'] < split['test_start_ts'] <= split['test_end_ts'] <= source:
            return False
        if validation['model']['rmse_mw'] > validation['baseline']['rmse_mw'] * 1.05 + 1e-9 or (validation['model'].get('r2') is not None and validation['model']['r2'] < 0):
            return False
    elif name == 'anomaly_isolation_forest' and validation.get('status') != 'unsupervised':
        return False
    elif name == 'health_baseline' and validation.get('status') != 'engineering_reference':
        return False
    try:
        return len(json.dumps(meta, allow_nan=False)) <= 200000
    except (TypeError, ValueError):
        return False


def validate_payload(section, payload):
    if section not in {'forecast', 'anomaly', 'health', 'status', 'drift'} or not isinstance(payload, dict):
        raise ValueError('Invalid AI publication section')
    if payload.get('schema_version') != 2 or payload.get('site_id') != cfg.SITE_ID or payload.get('device_id') != cfg.DEVICE_ID:
        raise ValueError('Invalid AI publication identity/schema')
    if not integer(payload.get('updated_at')) or not 0 <= int(time.time()) - payload['updated_at'] <= 300:
        raise ValueError('Invalid AI publication time')
    if payload.get('status') not in STATUSES or payload.get('data_origin') not in {'synthetic-test-inputs', 'device-history-unverified-calibration'}:
        raise ValueError('Invalid AI publication status/origin')
    fields = {'schema_version', 'site_id', 'device_id', 'updated_at', 'source_ts', 'data_origin', 'dataQuality', 'status', 'reason', 'total_rows', 'daylight_rows'}
    extras = {'forecast': {'predicted_power_mw', 'model_metadata'}, 'anomaly': {'is_anomaly', 'score', 'model_metadata'},
              'health': {'baseline_pr', 'physical_health', 'model_metadata'}, 'status': {'trained_models', 'skipped_models', 'model_states', 'model_info'},
              'drift': {'models', 'method', 'threshold', 'minimum_rows', 'note'}}
    if set(payload) - fields - extras[section] or payload.get('dataQuality') not in {'Estimated', 'Unavailable'}:
        raise ValueError('Unexpected AI publication fields/quality')
    if section == 'drift':
        validate_drift(payload)
    elif section == 'status':
        if not integer(payload.get('total_rows')) or not 0 <= payload['total_rows'] <= cfg.MAX_HISTORY_ROWS:
            raise ValueError('Invalid AI pipeline count')
        for key in ['trained_models', 'skipped_models']:
            values = payload.get(key)
            if not isinstance(values, list) or len(values) > 3 or any(name not in MODEL_NAMES for name in values):
                raise ValueError('Invalid AI pipeline model list')
        states = payload.get('model_states')
        info = payload.get('model_info')
        if not isinstance(states, dict) or set(states) != {'forecast', 'anomaly', 'health'} or any(value not in STATUSES for value in states.values()):
            raise ValueError('Invalid AI pipeline states')
        if not isinstance(info, dict) or set(info) != {'forecast', 'anomaly', 'health'}:
            raise ValueError('Invalid AI pipeline metadata')
        for row in info.values():
            if not isinstance(row, dict) or set(row) != {'model_version', 'trained_at', 'load_state', 'validation_status', 'data_origin'}:
                raise ValueError('Unexpected AI pipeline metadata')
            if row['trained_at'] is not None and (not integer(row['trained_at']) or row['trained_at'] <= 0):
                raise ValueError('Invalid AI model time')
            if row['load_state'] not in {'missing', 'ready', 'expired', 'legacy_unverified', 'invalid'}:
                raise ValueError('Invalid AI artifact state')
    elif payload['status'] == 'ok':
        source = payload.get('source_ts')
        if not integer(source) or not -300 <= int(time.time()) - source <= cfg.MAX_INPUT_AGE_SECONDS:
            raise ValueError('AI source input is stale or invalid')
        name = {'forecast': 'forecast_gbr', 'anomaly': 'anomaly_isolation_forest', 'health': 'health_baseline'}[section]
        if not valid_metadata(payload.get('model_metadata'), name):
            raise ValueError('AI model is unvalidated or expired')
        if not re.fullmatch('[a-f0-9]{64}', str(payload['model_metadata'].get('artifact_sha256', ''))):
            raise ValueError('AI model has not been saved as a validated artifact')
        if payload['model_metadata']['data_origin'] != payload['data_origin']:
            raise ValueError('AI source/model origin mismatch')
        if payload['source_ts'] < payload['model_metadata']['source_window_end_ts']:
            raise ValueError('AI result precedes its model source window')
        if section == 'forecast' and (not finite(payload.get('predicted_power_mw')) or not 0 <= payload['predicted_power_mw'] <= 1e12):
            raise ValueError('Invalid current-power estimate')
        if section == 'anomaly' and (not isinstance(payload.get('is_anomaly'), bool) or not finite(payload.get('score'))):
            raise ValueError('Invalid anomaly estimate')
        if section == 'health' and (not finite(payload.get('baseline_pr')) or not 0.4 <= payload['baseline_pr'] <= 1):
            raise ValueError('Invalid performance reference')
    json.dumps(payload, allow_nan=False)
    return payload


def validate_drift(payload):
    from pipeline.drift import METHOD, THRESHOLD, MINIMUM_ROWS, FIELDS
    if payload.get('method') != METHOD or payload.get('threshold') != THRESHOLD or payload.get('minimum_rows') != MINIMUM_ROWS or not isinstance(payload.get('note'), str) or len(payload['note']) > 1000:
        raise ValueError('Invalid drift policy')
    models = payload.get('models')
    if not isinstance(models, dict) or set(models) != {'forecast', 'anomaly', 'health'}:
        raise ValueError('Invalid drift models')
    if payload['status'] == 'ok' and (not integer(payload.get('source_ts')) or not -300 <= int(time.time()) - payload['source_ts'] <= cfg.MAX_INPUT_AGE_SECONDS):
        raise ValueError('Stale drift source')
    for row in models.values():
        if not isinstance(row, dict) or set(row) != {'status', 'model_version', 'trained_at', 'source_window_end_ts', 'recent_rows', 'max_psi', 'feature_psi'}:
            raise ValueError('Invalid drift fields')
        if row['status'] not in {'unavailable', 'insufficient_new_data', 'stable', 'drift_detected'}:
            raise ValueError('Invalid drift state')
        if row['model_version'] is not None and not re.fullmatch('[A-Za-z0-9_.-]{3,128}', str(row['model_version'])):
            raise ValueError('Invalid drift model version')
        if not isinstance(row['feature_psi'], dict) or set(row['feature_psi']) - set(FIELDS) or any(not finite(value) or value < 0 for value in row['feature_psi'].values()):
            raise ValueError('Invalid drift metric')
        if row['status'] == 'unavailable':
            if row['max_psi'] is not None or row['recent_rows'] is not None or row['feature_psi']:
                raise ValueError('Unavailable drift cannot contain metrics')
            continue
        if not row['model_version'] or not integer(row['trained_at']) or not -300 <= int(time.time()) - row['trained_at'] <= cfg.MAX_MODEL_AGE_SECONDS or not integer(row['source_window_end_ts']) or row['source_window_end_ts'] > (payload.get('source_ts') or 0):
            raise ValueError('Invalid drift model clocks')
        if not integer(row['recent_rows']) or not 0 <= row['recent_rows'] <= 500:
            raise ValueError('Invalid drift sample size')
        if row['status'] == 'insufficient_new_data':
            if row['recent_rows'] >= MINIMUM_ROWS or row['max_psi'] is not None or row['feature_psi']:
                raise ValueError('Insufficient drift cannot contain metrics')
        elif row['recent_rows'] < MINIMUM_ROWS or set(row['feature_psi']) != set(FIELDS) or not finite(row['max_psi']) or abs(row['max_psi'] - max(row['feature_psi'].values())) > 1e-9 or (row['status'] == 'drift_detected') != (row['max_psi'] >= THRESHOLD):
            raise ValueError('Inconsistent drift result')

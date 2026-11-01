"""Train only eligible candidates and publish schema-validated current-input results."""
import logging
import math
from numbers import Real
import time
from dataclasses import dataclass, field
from typing import Callable, Optional

import config as cfg
from data.features import add_time_features
from data.ingest import fetch_history, latest_reader as default_latest_reader
from models.anomaly.isolation_forest_detector import AnomalyModel
from models.forecast.gradient_boosting_forecaster import ForecastModel
from models.health.performance_ratio_model import HealthBaselineModel
from pipeline import publish, readiness

log = logging.getLogger('ai_engine.orchestrator')


@dataclass
class RunResult:
    total_rows: int
    trained: list = field(default_factory=list)
    skipped: list = field(default_factory=list)
    published: dict = field(default_factory=dict)
    errors: dict = field(default_factory=dict)


def _source(df):
    origin = 'synthetic-test-inputs' if len(df) and bool(df['simulated'].fillna(False).any()) else 'device-history-unverified-calibration'
    if not len(df):
        return {'source_ts': None, 'data_origin': origin}, 'not_enough_data'
    stamp = int(df.iloc[-1]['ts']); age = int(time.time()) - stamp
    state = 'invalid_input' if age < -300 else 'stale_input' if age > cfg.MAX_INPUT_AGE_SECONDS else 'ok'
    return {'source_ts': stamp, 'data_origin': origin}, state


def _complete(row, fields):
    return all(isinstance(row.get(key), Real) and not isinstance(row[key], bool) and math.isfinite(float(row[key])) for key in fields)


def run(reader: Optional[Callable[[], dict]] = None,
        writer: Optional[Callable[[str, dict], None]] = None,
        *, train=True, latest_reader=None) -> RunResult:
    df = fetch_history(reader=reader)
    result = RunResult(total_rows=len(df))
    context, source_state = _source(df)
    models = {'forecast': ForecastModel(origin=context['data_origin']), 'anomaly': AnomalyModel(origin=context['data_origin']), 'health': HealthBaselineModel(origin=context['data_origin'])}
    for model in models.values():
        model.load()
    thresholds = {'forecast': (cfg.MIN_DAYLIGHT_ROWS_FORECAST, cfg.MIN_DAYLIGHT_ROWS_FORECAST),
                  'anomaly': (cfg.MIN_ROWS_ANOMALY, 10), 'health': (cfg.MIN_ROWS_HEALTH_BASELINE, cfg.MIN_ROWS_HEALTH_BASELINE)}
    if train and source_state == 'ok':
        for section, model in models.items():
            _run_model(model, df, *thresholds[section], result)
    else:
        result.skipped.extend((model.name, source_state if train else 'prediction_only') for model in models.values())
    if latest_reader is not None or reader is None:
        current = fetch_history(reader=latest_reader or default_latest_reader, max_rows=1)
    else:
        current = df
    context, source_state = _source(current)
    latest = current.tail(1)
    row = latest.iloc[0] if len(latest) else None
    features = add_time_features(latest) if len(latest) else latest
    for section, model in models.items():
        state = source_state
        if state == 'ok' and f'{model.name}_train' in result.errors:
            state = 'validation_failed'
        if state == 'ok' and not model.is_trained():
            state = 'model_expired' if model.load_state == 'expired' else 'not_enough_data'
        if state == 'ok' and model.metadata.get('data_origin') != context['data_origin']:
            state = 'model_unavailable'
        if state == 'ok' and context['source_ts'] < model.metadata.get('source_window_end_ts', 0):
            state = 'model_unavailable'
        required = ['light_lux', 'temp_c', 'power_mw']
        if section == 'anomaly':
            required += ['voltage_v', 'current_ma', 'dust_ugm3']
        if state == 'ok' and not _complete(row, required):
            state = 'invalid_input'
        if state == 'ok' and section in {'forecast', 'anomaly'} and row['light_lux'] <= cfg.DAYLIGHT_LUX_THRESHOLD:
            state = 'not_enough_daylight'
        values = {}
        if state == 'ok':
            try:
                if section == 'forecast':
                    values = {'predicted_power_mw': round(model.predict_from_latest(features), 1)}
                elif section == 'anomaly':
                    values = model.score_latest(latest)
                else:
                    values = {'baseline_pr': round(model.baseline_pr(), 3), 'physical_health': None}
            except Exception:
                state = 'invalid_input'; result.errors[f'{section}_predict'] = 'prediction_failed'
                log.error('Current-input model prediction unavailable')
        payload = {**context, 'status': state}
        if state == 'ok':
            payload.update(values); payload['model_metadata'] = model.metadata
        else:
            payload.update({'reason': state, 'total_rows': len(df), 'daylight_rows': int((df['light_lux'] > cfg.DAYLIGHT_LUX_THRESHOLD).sum())})
        result.published[section] = publish.publish(section, payload, writer)
    info = {section: {'model_version': model.metadata.get('model_version'), 'trained_at': model.metadata.get('trained_at'),
                      'load_state': model.load_state, 'validation_status': model.metadata.get('validation', {}).get('status'),
                      'data_origin': model.metadata.get('data_origin')} for section, model in models.items()}
    publish.publish('status', {**context, 'status': source_state if source_state != 'ok' else ('validation_failed' if result.errors else 'ok'),
        'total_rows': len(df), 'trained_models': result.trained, 'skipped_models': [item[0] for item in result.skipped],
        'model_states': {section: value['status'] for section, value in result.published.items()}, 'model_info': info}, writer)
    return result


def _run_model(model, df, min_total_rows, min_daylight_rows, result):
    status = readiness.check(df, model, min_total_rows, min_daylight_rows)
    if not status.ready:
        result.skipped.append((model.name, status.reason)); return
    try:
        model.fit(df); model.save(); result.trained.append(model.name)
        log.info('Validated model candidate saved')
    except Exception:
        result.errors[f'{model.name}_train'] = 'training_or_validation_failed'
        log.error('Model training or validation unavailable; previous artifact preserved')

"""Offline chronological evaluation; importing this module never accesses Firebase."""
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor, IsolationForest
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

import config as cfg
from data.features import build_forecast_dataset, build_anomaly_dataset


def regression_metrics(actual, predicted):
    actual, predicted = np.asarray(actual, dtype=float), np.asarray(predicted, dtype=float)
    if len(actual) < 2 or not np.isfinite(actual).all() or not np.isfinite(predicted).all():
        raise ValueError('Insufficient finite validation values')
    return {'mae_mw': float(mean_absolute_error(actual, predicted)),
            'rmse_mw': float(np.sqrt(mean_squared_error(actual, predicted))),
            'r2': float(r2_score(actual, predicted)) if np.var(actual) > 1e-12 else None}


def anomaly_metrics(labels, predicted):
    pairs = [(bool(label), bool(pred)) for label, pred in zip(labels, predicted)
             if isinstance(label, (bool, np.bool_)) or (isinstance(label, (int, np.integer)) and label in (0, 1))]
    tp = sum(label and pred for label, pred in pairs)
    fp = sum(not label and pred for label, pred in pairs)
    fn = sum(label and not pred for label, pred in pairs)
    return {'precision': tp / (tp + fp) if tp + fp else None,
            'recall': tp / (tp + fn) if tp + fn else None,
            'labelled_rows': len(pairs), 'positive_labels': sum(label for label, _ in pairs),
            'basis': 'Recorded labels only; their physical correctness is not independently verified.'}


def expected_power_mw(frame):
    if not all(np.isfinite(value) for value in [cfg.PANEL_PMAX_W, cfg.LUX_PER_WM2, cfg.NOCT_C, cfg.TEMP_COEFF]) or cfg.PANEL_PMAX_W <= 0 or cfg.LUX_PER_WM2 <= 0:
        raise ValueError('Invalid engineering baseline configuration')
    irradiance = frame['light_lux'] / cfg.LUX_PER_WM2
    cell = frame['temp_c'] + (cfg.NOCT_C - 20) / 800 * irradiance
    return (cfg.PANEL_PMAX_W * irradiance * (1 + cfg.TEMP_COEFF * (cell - 25))).clip(lower=0)


def fit_power(frame):
    frame = frame.sort_values('ts').drop_duplicates('ts').reset_index(drop=True).copy()
    X, y = build_forecast_dataset(frame)
    if len(X) < 100:
        raise ValueError('At least 100 complete daylight power/light/temperature rows are required')
    split = int(len(X) * 0.8)
    train, test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]
    if len(train) < 50 or len(test) < 20:
        raise ValueError('Insufficient chronological training or validation rows')
    columns = [column for column in train.columns if train[column].notna().any()]
    model = Pipeline([('impute', SimpleImputer(strategy='median')),
                      ('regressor', GradientBoostingRegressor(n_estimators=150, learning_rate=0.05, max_depth=3, random_state=42))])
    model.fit(train[columns], y_train)
    prediction = np.clip(model.predict(test[columns]), 0, None)
    train_expected = expected_power_mw(frame.loc[train.index])
    ratios = (y_train / train_expected.where(train_expected > 0)).replace([np.inf, -np.inf], np.nan).dropna()
    if len(ratios) < 20:
        raise ValueError('Insufficient engineering baseline observations')
    baseline_pr = float(np.clip(np.percentile(ratios, 90), 0.4, 1.0))
    baseline_prediction = expected_power_mw(frame.loc[test.index]) * baseline_pr
    metrics, baseline = regression_metrics(y_test, prediction), regression_metrics(y_test, baseline_prediction)
    accepted = bool(metrics['rmse_mw'] <= baseline['rmse_mw'] * 1.05 + 1e-9 and (metrics['r2'] is None or metrics['r2'] >= 0))
    report = {'method_version': 'power-evaluation-v2', 'status': 'evaluated', 'accepted': accepted,
              'model': metrics, 'baseline': baseline, 'baseline_pr': baseline_pr,
              'baseline_method': 'Training-only 90th-percentile performance ratio, clipped to 0.4–1.0; configured panel/lux/temperature assumptions are unverified.',
              'acceptance_policy': 'Finite held-out error, nonnegative R2 when defined, RMSE no more than 5% above the engineering baseline. This policy is not field accuracy assurance.',
              'split': {'method': 'chronological_holdout', 'train_rows': len(train), 'test_rows': len(test),
                        'train_start_ts': int(frame.loc[train.index, 'ts'].min()), 'train_end_ts': int(frame.loc[train.index, 'ts'].max()),
                        'test_start_ts': int(frame.loc[test.index, 'ts'].min()), 'test_end_ts': int(frame.loc[test.index, 'ts'].max())},
              'feature_columns': columns, 'imputation': 'Medians fitted on training rows only; entirely missing training features excluded.',
              'horizon': 'Current conditions only; not a weather-ahead forecast',
              'units': 'Power errors in milliwatts; R2 dimensionless and Unavailable for a constant target.'}
    return model, report, columns


def evaluate_anomaly(frame):
    frame = frame.sort_values('ts').drop_duplicates('ts')
    X = build_anomaly_dataset(frame)
    if len(X) < 100:
        return {'status': 'insufficient_data', 'precision': None, 'recall': None, 'labelled_rows': 0}
    split = int(len(X) * 0.8)
    labels = frame.loc[X.iloc[split:].index, 'anomaly_label'].tolist() if 'anomaly_label' in frame else [None] * (len(X) - split)
    if not any(isinstance(value, (bool, np.bool_)) for value in labels):
        return {'status': 'unlabelled', 'precision': None, 'recall': None, 'labelled_rows': 0}
    model = IsolationForest(n_estimators=200, contamination=0.02, random_state=42).fit(X.iloc[:split])
    return {'status': 'evaluated_label_proxy', **anomaly_metrics(labels, model.predict(X.iloc[split:]) == -1),
            'train_end_ts': int(frame.loc[X.iloc[:split].index, 'ts'].max()),
            'test_start_ts': int(frame.loc[X.iloc[split:].index, 'ts'].min())}

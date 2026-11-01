"""Current-condition power estimator with chronological holdout validation.

Environmental/time features estimate power at the same timestamp. No weather
provider, future light input or validated confidence interval is available.
Training-only imputation and an engineering baseline comparison are reported;
synthetic test performance is not evidence of accuracy at a real site.
"""
import numpy as np
import hashlib
import json
from evaluation import fit_power
from data.features import BASE_FEATURE_COLUMNS, build_forecast_dataset
from models.base import BaseModel
from pipeline.drift import reference


class ForecastModel(BaseModel):
    name = "forecast_gbr"

    def fit(self, df):
        model, validation, columns = fit_power(df)
        if not validation['accepted']:
            raise ValueError('Current-condition candidate did not pass the chronological baseline comparison')
        self.estimator = model
        identity = hashlib.sha256(json.dumps(validation, sort_keys=True).encode()).hexdigest()[:16]
        training_features, _ = build_forecast_dataset(df.sort_values('ts').drop_duplicates('ts'))
        self._stamp_metadata(
            drift_reference=reference(training_features.iloc[:validation['split']['train_rows']]),
            schema_version=2, model_version=f'current-gbr-v2-{identity}', validation=validation,
            data_origin='synthetic-test-inputs' if 'simulated' in df and bool(df['simulated'].fillna(False).any()) else 'device-history-unverified-calibration',
            source_window_end_ts=int(df['ts'].max()),
            rows_used=validation['split']['train_rows'],
            total_rows_at_train=int(len(df)),
            val_mae_mw=validation['model']['mae_mw'],
            feature_columns=columns,
            horizon_note=(
                "Same-conditions estimate from the latest reading, not a "
                "weather-ahead forecast — there is no forecast weather feed."
            ),
        )
        return self

    def predict_from_latest(self, latest_features_row) -> float:
        """latest_features_row: a 1-row DataFrame with BASE_FEATURE_COLUMNS
        (see data/features.add_time_features). Returns predicted power in mW,
        clamped to zero — a negative forecast is meaningless."""
        if self.estimator is None:
            raise RuntimeError("Forecast model not trained yet")
        columns = self.metadata.get('feature_columns', BASE_FEATURE_COLUMNS)
        pred = float(self.estimator.predict(latest_features_row.reindex(columns=columns))[0])
        return max(0.0, pred)

    def predict(self, df):
        X = df.reindex(columns=self.metadata.get('feature_columns', BASE_FEATURE_COLUMNS))
        return np.clip(self.estimator.predict(X), 0, None)

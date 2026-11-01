"""
Short-horizon power forecaster.

Model choice: GradientBoostingRegressor over light/temp/humidity/dust/
time-of-day features. Tree-ensemble methods (Random Forest, Gradient
Boosting, XGBoost) are consistently reported as strong, interpretable
baselines for short-term PV power forecasting from environmental sensor
data — see e.g. Gradient Boosting outperforming Random Forest and KNN on
tilt-angle PV data (Springer, IJEWR 2026), Random Forest as the top
regressor on an Australian PV dataset (Sustainable Energy Research, 2024),
and the broader RF/XGBoost/LSTM comparative review (arXiv:2509.24059).
GBR was picked here over Random Forest specifically because more than one
of these studies found it edged ahead on PV regression tasks, and it trains
fast enough to retrain from a cron job. Swap the estimator in fit() if your
own data says otherwise — that's exactly what this pipeline is for.

This model predicts *current* power from *current* conditions (a same-
timestep regressor), not power N hours from now — there is no weather
forecast feed in this system yet. "1h ahead" in the dashboard is this same
model applied to the most recent reading, which is a same-conditions
persistence-style estimate, not a true weather-aware forecast. Said plainly
in the metadata (`horizon_note`) rather than implied.
"""
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error

from data.features import BASE_FEATURE_COLUMNS, build_forecast_dataset
from models.base import BaseModel


class ForecastModel(BaseModel):
    name = "forecast_gbr"

    def fit(self, df):
        X, y = build_forecast_dataset(df)
        if len(X) < 10:
            raise ValueError(f"Not enough daylight rows to fit forecaster ({len(X)})")

        # Chronological split — never shuffle time series for evaluation,
        # or the model gets to "see the future" during validation.
        split = int(len(X) * 0.8)
        X_train, X_val = X.iloc[:split], X.iloc[split:]
        y_train, y_val = y.iloc[:split], y.iloc[split:]

        model = GradientBoostingRegressor(
            n_estimators=150, learning_rate=0.05, max_depth=3, random_state=42,
        )
        model.fit(X_train, y_train)

        mae = float(mean_absolute_error(y_val, model.predict(X_val))) if len(X_val) else None
        self.estimator = model
        self._stamp_metadata(
            rows_used=int(len(X)),
            total_rows_at_train=int(len(df)),
            val_mae_mw=mae,
            feature_columns=BASE_FEATURE_COLUMNS,
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
        pred = float(self.estimator.predict(latest_features_row[BASE_FEATURE_COLUMNS])[0])
        return max(0.0, pred)

    def predict(self, df):
        X = df[BASE_FEATURE_COLUMNS]
        return np.clip(self.estimator.predict(X), 0, None)

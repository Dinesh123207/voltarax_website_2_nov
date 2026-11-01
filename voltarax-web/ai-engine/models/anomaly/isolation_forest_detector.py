"""
Unsupervised anomaly detector over voltage/current/power/light/temp/dust.

Same technique and same daylight-only training rationale as
hardware/raspberry-pi/train_model.py (that script trains a local copy for
the Pi's Tkinter dashboard). This class does the same job but publishes its
result to Firebase (/solar_site/ai/anomaly) so the *web* dashboard sees it
too, not just a Pi sitting next to the panels. If you already run the Pi
dashboard, both can coexist — they train on the same history and should
broadly agree.

Isolation Forest was kept (rather than swapped for something fancier)
because it needs no labelled "this was a fault" examples — which nobody has
yet — and isolates outliers directly from how few random splits it takes to
separate a point from the rest, a good fit for "flag anything unusual" with
no fault taxonomy defined up front.
"""
from sklearn.ensemble import IsolationForest

from data.features import ANOMALY_FEATURE_COLUMNS, build_anomaly_dataset
from models.base import BaseModel


class AnomalyModel(BaseModel):
    name = "anomaly_isolation_forest"

    def fit(self, df):
        X = build_anomaly_dataset(df)
        if len(X) < 10:
            raise ValueError(f"Not enough daylight rows to fit anomaly model ({len(X)})")

        model = IsolationForest(n_estimators=200, contamination=0.02, random_state=42)
        model.fit(X)

        self.estimator = model
        self._stamp_metadata(rows_used=int(len(X)), feature_columns=ANOMALY_FEATURE_COLUMNS,
                              total_rows_at_train=int(len(df)))
        return self

    def score_latest(self, latest_row) -> dict:
        """latest_row: 1-row DataFrame with ANOMALY_FEATURE_COLUMNS.
        Returns {is_anomaly, score} — lower score = more anomalous, matching
        scikit-learn's own convention, surfaced as-is rather than remapped."""
        if self.estimator is None:
            raise RuntimeError("Anomaly model not trained yet")
        X = latest_row[ANOMALY_FEATURE_COLUMNS]
        pred = int(self.estimator.predict(X)[0])       # -1 = anomaly, 1 = normal
        score = float(self.estimator.decision_function(X)[0])
        return {"is_anomaly": pred == -1, "score": round(score, 4)}

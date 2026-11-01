"""Training-history performance-ratio reference, not a verified healthy label.

The 90th percentile is clipped by an explicit engineering assumption. No
labelled physical health, panel calibration or coating chemistry is inferred.
Missing power/light/temperature cannot be replaced by healthy defaults.
"""
import numpy as np

import config as cfg
from data.features import daylight_only
from models.base import BaseModel

PERCENTILE = 90  # "how the panel performs on its better days", not its best-ever spike


def _performance_ratio(df):
    df = df.replace([np.inf, -np.inf], np.nan).dropna(subset=['light_lux', 'temp_c', 'power_mw'])
    g = df["light_lux"] / cfg.LUX_PER_WM2                               # estimated irradiance
    t_cell = df["temp_c"] + (cfg.NOCT_C - 20) / 800.0 * g
    expected_w = cfg.PANEL_PMAX_W * g / 1000.0 * (1 + cfg.TEMP_COEFF * (t_cell - 25))
    actual_w = df["power_mw"] / 1000.0
    mask = (g > 200) & (expected_w > 0)
    return (actual_w[mask] / expected_w[mask]).replace([np.inf, -np.inf], np.nan).dropna()


class HealthBaselineModel(BaseModel):
    name = "health_baseline"

    def fit(self, df):
        total_rows = len(df)
        source_end = int(df['ts'].max())
        origin = 'synthetic-test-inputs' if 'simulated' in df and bool(df['simulated'].fillna(False).any()) else 'device-history-unverified-calibration'
        df = daylight_only(df)
        pr = _performance_ratio(df)
        if len(pr) < 10:
            raise ValueError(f"Not enough daylight rows to fit health baseline ({len(pr)})")

        baseline = float(np.percentile(pr, PERCENTILE))
        # Keep it in a sane range — a data glitch shouldn't produce a baseline
        # of 3.0 that nothing can ever meet, or 0.01 that nothing can ever miss.
        baseline = min(max(baseline, 0.4), 1.0)

        self.estimator = {"baseline_pr": baseline}
        self._stamp_metadata(
            rows_used=int(len(pr)),
            total_rows_at_train=total_rows,
            source_window_end_ts=source_end, data_origin=origin,
            validation={'status': 'engineering_reference', 'physical_health': None,
                        'note': 'Training-history reference only; physical health and calibration are unverified.'},
            percentile=PERCENTILE,
            median_pr_observed=round(float(np.median(pr)), 3),
        )
        return self

    def baseline_pr(self) -> float:
        if self.estimator is None:
            raise RuntimeError("Health baseline not trained yet")
        return self.estimator["baseline_pr"]

    def predict(self, df):
        return _performance_ratio(daylight_only(df)) / self.baseline_pr()

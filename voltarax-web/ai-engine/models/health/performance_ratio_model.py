"""
Adaptive healthy-performance baseline.

hardware/raspberry-pi/analysis.py asks you to manually watch the dashboard
for a few clear days and hand-set BASELINE_PR to whatever performance ratio
you saw. This model does that automatically: it computes the performance
ratio (actual power / expected power at the observed irradiance and cell
temperature) for every daylight reading, and takes a high percentile of the
recent distribution as "what healthy looks like for this exact panel, at
this exact site, right now" — which self-corrects for local shading, panel
age, tilt, wiring losses etc. instead of using one manually-typed number
forever.

This is intentionally NOT a supervised model: nobody has labelled "this
reading was actually healthy" ground truth, so training a classifier or
regressor against a target nobody can verify would be fabricating rigour
that isn't there. A robust percentile of the panel's own good days is the
honest amount of "learning" the available data supports — a static
baseline is exactly what the reference guide substitutes it for, but
computed from data instead of a person eyeballing a chart.
"""
import numpy as np

import config as cfg
from data.features import daylight_only
from models.base import BaseModel

PERCENTILE = 90  # "how the panel performs on its better days", not its best-ever spike


def _performance_ratio(df):
    g = df["light_lux"].fillna(0) / cfg.LUX_PER_WM2                       # irradiance, W/m2
    t_cell = df["temp_c"].fillna(25) + (cfg.NOCT_C - 20) / 800.0 * g      # estimated cell temp
    expected_w = cfg.PANEL_PMAX_W * g / 1000.0 * (1 + cfg.TEMP_COEFF * (t_cell - 25))
    actual_w = df["power_mw"].fillna(0) / 1000.0
    mask = (g > 200) & (expected_w > 0)
    return (actual_w[mask] / expected_w[mask]).replace([np.inf, -np.inf], np.nan).dropna()


class HealthBaselineModel(BaseModel):
    name = "health_baseline"

    def fit(self, df):
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
            total_rows_at_train=int(len(df)),
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

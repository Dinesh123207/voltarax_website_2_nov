"""
Proves the automation pipeline actually works end-to-end, without real
Firebase credentials or real hardware: synthetic telemetry in (played
through the exact ingest.raw_history_to_frame parser real Firebase data
would go through), trained models and real predictions out.

Run: cd ai-engine && pytest tests/ -v
"""
import math
import random
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import config as cfg  # noqa: E402


def make_synthetic_history(days=10, seed=7, start_day=0):
    """A daylight bell curve (light -> power, with the same PANEL_PMAX_W/
    LUX_PER_WM2 relationship config.py assumes) plus night rows at zero,
    plus small sensor noise — enough structure for every model to find a
    real, checkable pattern instead of fitting to pure noise.
    start_day offsets the timestamp range so a second "more history arrived"
    batch doesn't collide (and get deduplicated) with an earlier batch."""
    random.seed(seed)
    raw = {}
    t0 = 1_735_689_600  # 2025-01-01T00:00:00Z
    i = 0
    for day in range(start_day, start_day + days):
        for minute in range(0, 24 * 60, 5):  # every 5 min, like the firmware's LATEST_MS
            ts = t0 + day * 86400 + minute * 60
            hour = (minute / 60) % 24
            daylight = max(0.0, math.sin(math.pi * (hour - 6) / 12)) if 6 <= hour <= 18 else 0.0
            lux = daylight * 90000 * random.uniform(0.9, 1.05)
            g = lux / cfg.LUX_PER_WM2
            temp_c = 24 + 10 * daylight + random.uniform(-1, 1)
            t_cell = temp_c + (cfg.NOCT_C - 20) / 800.0 * g
            expected_w = cfg.PANEL_PMAX_W * g / 1000.0 * (1 + cfg.TEMP_COEFF * (t_cell - 25))
            power_w = max(0.0, expected_w * random.uniform(0.93, 1.0))  # a healthy, slightly-lossy real panel
            raw[f"-row{i:06d}"] = {
                "ts": ts, "device_id": "nodemcu-01", "site_id": cfg.SITE_ID,
                "voltage_v": round(11.5 + daylight * 0.6, 2),
                "current_ma": round(power_w * 1000 / max(11.5, 1), 1),
                "power_mw": round(power_w * 1000, 1),
                "light_lux": round(lux, 0),
                "temp_c": round(temp_c, 1),
                "humidity_pct": round(45 + random.uniform(-5, 5), 0),
                "dust_ugm3": round(30 + random.uniform(-10, 10), 0),
                "rssi": -60, "uptime_s": i * 300,
                "sensors_ok": {"ina219": True, "bh1750": True},
            }
            i += 1
    return raw


class FakeWriter:
    """Captures every publish.publish() call in place of a real Firebase write."""
    def __init__(self):
        self.store = {}

    def __call__(self, path, value):
        self.store[path] = value


@pytest.fixture(autouse=True)
def isolated_artifacts(tmp_path, monkeypatch):
    """Each test gets its own empty artifacts/ dir — tests must never depend
    on run order or leave trained models behind for the next test."""
    monkeypatch.setattr(cfg, "ARTIFACTS_DIR", tmp_path)
    tmp_path.mkdir(exist_ok=True)


def test_reports_not_enough_data_with_no_history():
    from pipeline.orchestrator import run
    writer = FakeWriter()
    result = run(reader=lambda: {}, writer=writer)

    assert result.total_rows == 0
    assert result.trained == []
    assert writer.store["/solar_site/ai/forecast"]["status"] == "not_enough_data"
    assert writer.store["/solar_site/ai/anomaly"]["status"] == "not_enough_data"
    assert writer.store["/solar_site/ai/health"]["status"] == "not_enough_data"
    assert "0/" in writer.store["/solar_site/ai/forecast"]["reason"]


def test_reports_not_enough_data_below_threshold():
    """A little bit of data (below every model's threshold) — still an
    honest 'not enough yet', never a half-trained guess."""
    from pipeline.orchestrator import run
    raw = make_synthetic_history(days=1)
    writer = FakeWriter()
    result = run(reader=lambda: raw, writer=writer)

    assert result.total_rows == len(raw)
    assert result.trained == []
    for section in ("forecast", "anomaly", "health"):
        assert writer.store[f"/solar_site/ai/{section}"]["status"] == "not_enough_data"


def test_trains_and_publishes_once_enough_data_exists():
    from pipeline.orchestrator import run
    raw = make_synthetic_history(days=10)
    writer = FakeWriter()
    result = run(reader=lambda: raw, writer=writer)

    assert set(result.trained) == {"forecast_gbr", "anomaly_isolation_forest", "health_baseline"}
    assert result.errors == {}

    fc = writer.store["/solar_site/ai/forecast"]
    assert fc["status"] == "ok"
    assert fc["predicted_power_mw"] >= 0
    assert fc["model_metadata"]["rows_used"] > 0
    assert "horizon_note" in fc["model_metadata"]

    an = writer.store["/solar_site/ai/anomaly"]
    assert an["status"] == "ok"
    assert isinstance(an["is_anomaly"], bool)

    he = writer.store["/solar_site/ai/health"]
    assert he["status"] == "ok"
    assert 0.4 <= he["baseline_pr"] <= 1.0

    status = writer.store["/solar_site/ai/status"]
    assert status["total_rows"] == len(raw)


def test_forecast_tracks_daylight_not_flat():
    """A trained forecaster should predict near-zero at night and
    meaningfully positive at midday — proof it learned the light -> power
    relationship rather than just memorising the training mean."""
    from data.features import add_time_features
    from pipeline.orchestrator import run
    from models.forecast.gradient_boosting_forecaster import ForecastModel

    raw = make_synthetic_history(days=10)
    run(reader=lambda: raw, writer=FakeWriter())

    model = ForecastModel()
    assert model.load(), "model should have been saved by the pipeline run above"

    import pandas as pd
    night = pd.DataFrame([{"ts": 1_735_689_600, "light_lux": 0, "temp_c": 20,
                            "humidity_pct": 50, "dust_ugm3": 30}])
    noon = pd.DataFrame([{"ts": 1_735_732_800, "light_lux": 85000, "temp_c": 34,
                           "humidity_pct": 40, "dust_ugm3": 30}])
    night_pred = model.predict_from_latest(add_time_features(night))
    noon_pred = model.predict_from_latest(add_time_features(noon))
    assert noon_pred > night_pred


def test_anomaly_model_flags_a_real_fault():
    """A panel reporting near-zero power in full sun (e.g. a snapped wire)
    should score as an anomaly once the model has seen what normal looks
    like — the whole reason this model exists."""
    from pipeline.orchestrator import run
    from models.anomaly.isolation_forest_detector import AnomalyModel

    raw = make_synthetic_history(days=10)
    run(reader=lambda: raw, writer=FakeWriter())

    model = AnomalyModel()
    assert model.load()

    import pandas as pd
    fault = pd.DataFrame([{"voltage_v": 0.2, "current_ma": 0, "power_mw": 0,
                            "light_lux": 90000, "temp_c": 34, "dust_ugm3": 30}])
    result = model.score_latest(fault)
    assert result["is_anomaly"] is True


def test_second_run_skips_retraining_on_small_new_data(monkeypatch):
    """Simulates an hourly cron: after the first successful training run,
    a follow-up run with only a few new rows should NOT retrain — proves
    MIN_NEW_ROWS_TO_RETRAIN actually gates retraining rather than the
    pipeline blindly retraining on every scheduled tick."""
    from pipeline.orchestrator import run

    raw = make_synthetic_history(days=10)
    first = run(reader=lambda: raw, writer=FakeWriter())
    assert "forecast_gbr" in first.trained

    extra = make_synthetic_history(days=1, seed=99, start_day=10)  # genuinely new timestamps, small batch
    small_addition = dict(list(extra.items())[:20])
    raw_plus_a_little = {**raw, **{f"new-{k}": v for k, v in small_addition.items()}}

    second = run(reader=lambda: raw_plus_a_little, writer=FakeWriter())
    assert "forecast_gbr" not in second.trained
    assert any("already trained" in reason for _, reason in second.skipped)


def test_third_run_retrains_after_enough_new_data():
    from pipeline.orchestrator import run

    raw = make_synthetic_history(days=10)
    run(reader=lambda: raw, writer=FakeWriter())

    more = make_synthetic_history(days=3, seed=123, start_day=10)  # genuinely new timestamps
    combined = {**raw, **{f"more-{k}": v for k, v in more.items()}}  # well over MIN_NEW_ROWS_TO_RETRAIN

    second = run(reader=lambda: combined, writer=FakeWriter())
    assert "forecast_gbr" in second.trained


def test_ingest_skips_malformed_rows_without_crashing():
    from data.ingest import raw_history_to_frame

    df = raw_history_to_frame({
        "good": {"ts": 1735689600, "power_mw": 100, "light_lux": 500},
        "missing_ts": {"power_mw": 50},
        "not_a_dict": "oops",
    })
    assert len(df) == 1
    assert df.iloc[0]["power_mw"] == 100

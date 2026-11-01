"""
This is the one thing you schedule (cron/systemd — see scripts/schedule_cron.md).
Every run: pull history -> for each model, check readiness -> train if
warranted -> predict from the latest reading -> publish to Firebase.

Nothing here requires the hardware to be connected today. Before any real
telemetry exists, every run simply publishes "not_enough_data" for each
model and exits 0 — the moment `/solar_site/history` starts filling up (the
NodeMCU writing directly, per hardware/README.md, needs zero changes on this
side), the next scheduled run sees enough rows, trains, and starts
publishing real predictions automatically. That hand-off is the point of
this file.
"""
import logging
from dataclasses import dataclass, field
from typing import Callable, Optional

import config as cfg
from data.features import add_time_features
from data.ingest import fetch_history
from models.anomaly.isolation_forest_detector import AnomalyModel
from models.forecast.gradient_boosting_forecaster import ForecastModel
from models.health.performance_ratio_model import HealthBaselineModel
from pipeline import publish, readiness

log = logging.getLogger("ai_engine.orchestrator")


@dataclass
class RunResult:
    total_rows: int
    trained: list = field(default_factory=list)
    skipped: list = field(default_factory=list)
    published: dict = field(default_factory=dict)
    errors: dict = field(default_factory=dict)


def run(reader: Optional[Callable[[], dict]] = None,
        writer: Optional[Callable[[str, dict], None]] = None) -> RunResult:
    df = fetch_history(reader=reader)
    result = RunResult(total_rows=len(df))
    log.info("Pulled %d history rows from Firebase", len(df))

    forecast = ForecastModel(); forecast.load()
    anomaly = AnomalyModel(); anomaly.load()
    health = HealthBaselineModel(); health.load()

    _run_model(forecast, df, cfg.MIN_DAYLIGHT_ROWS_FORECAST, cfg.MIN_DAYLIGHT_ROWS_FORECAST, result)
    _run_model(anomaly, df, cfg.MIN_ROWS_ANOMALY, 10, result)
    _run_model(health, df, cfg.MIN_ROWS_HEALTH_BASELINE, cfg.MIN_ROWS_HEALTH_BASELINE, result)

    latest = df.tail(1)
    latest_features = add_time_features(latest) if len(latest) else latest

    # ---- forecast ----------------------------------------------------------
    if forecast.is_trained() and len(latest_features):
        try:
            pred_mw = forecast.predict_from_latest(latest_features)
            result.published["forecast"] = publish.publish("forecast", {
                "status": "ok",
                "predicted_power_mw": round(pred_mw, 1),
                "model_metadata": forecast.metadata,
            }, writer)
        except Exception as e:  # noqa: BLE001 - deliberately broad: one model's
            log.exception("forecast prediction failed")            # bad input must never
            result.errors["forecast_predict"] = str(e)              # take down the others
    else:
        r = readiness.check(df, forecast, cfg.MIN_DAYLIGHT_ROWS_FORECAST, cfg.MIN_DAYLIGHT_ROWS_FORECAST)
        result.published["forecast"] = publish.not_enough_data("forecast", r.reason, r, writer)

    # ---- anomaly -------------------------------------------------------------
    if anomaly.is_trained() and len(latest):
        try:
            score = anomaly.score_latest(latest)
            result.published["anomaly"] = publish.publish("anomaly", {
                "status": "ok", **score, "model_metadata": anomaly.metadata,
            }, writer)
        except Exception as e:  # noqa: BLE001
            log.exception("anomaly scoring failed")
            result.errors["anomaly_predict"] = str(e)
    else:
        r = readiness.check(df, anomaly, cfg.MIN_ROWS_ANOMALY, 10)
        result.published["anomaly"] = publish.not_enough_data("anomaly", r.reason, r, writer)

    # ---- health baseline -------------------------------------------------
    if health.is_trained():
        result.published["health"] = publish.publish("health", {
            "status": "ok",
            "baseline_pr": round(health.baseline_pr(), 3),
            "model_metadata": health.metadata,
        }, writer)
    else:
        r = readiness.check(df, health, cfg.MIN_ROWS_HEALTH_BASELINE, cfg.MIN_ROWS_HEALTH_BASELINE)
        result.published["health"] = publish.not_enough_data("health", r.reason, r, writer)

    publish.publish("status", {
        "total_rows": len(df),
        "trained_models": result.trained,
        "skipped_models": [s[0] for s in result.skipped],
    }, writer)

    return result


def _run_model(model, df, min_total_rows, min_daylight_rows, result: RunResult):
    r = readiness.check(df, model, min_total_rows, min_daylight_rows)
    if not r.ready:
        result.skipped.append((model.name, r.reason))
        log.info("%s: skipped — %s", model.name, r.reason)
        return
    try:
        model.fit(df)
        model.save()
        result.trained.append(model.name)
        log.info("%s: trained on %d rows", model.name, r.total_rows)
    except Exception as e:  # noqa: BLE001 - one model failing to train must
        log.exception("%s: training failed", model.name)          # never stop the others
        result.errors[f"{model.name}_train"] = str(e)

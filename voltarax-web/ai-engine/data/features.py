"""
Feature engineering, shared by the forecast and anomaly models so both see
the same derived columns. Pure pandas transforms of data/ingest.py's output
— no I/O here either.
"""
import numpy as np
import pandas as pd

import config as cfg

# Features used by both the forecaster and the anomaly detector. Time-of-day
# is encoded as sin/cos (not a raw hour 0-23) so the model sees midnight and
# 23:59 as neighbours instead of as far apart as possible — standard practice
# for cyclical time features in the forecasting literature cited in README.md.
BASE_FEATURE_COLUMNS = [
    "light_lux", "temp_c", "humidity_pct", "dust_ugm3",
    "hour_sin", "hour_cos", "is_daylight",
]
ANOMALY_FEATURE_COLUMNS = [
    "voltage_v", "current_ma", "power_mw", "light_lux", "temp_c", "dust_ugm3",
]


def add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    dt = pd.to_datetime(df["ts"], unit="s", utc=True)
    hour = dt.dt.hour + dt.dt.minute / 60.0
    df["hour_sin"] = np.sin(2 * np.pi * hour / 24)
    df["hour_cos"] = np.cos(2 * np.pi * hour / 24)
    df["is_daylight"] = (df["light_lux"].fillna(0) > cfg.DAYLIGHT_LUX_THRESHOLD).astype(int)
    return df


def daylight_only(df: pd.DataFrame) -> pd.DataFrame:
    """Night-time rows are near-zero power almost by definition and would
    dominate a forecaster's error metric for free without teaching it
    anything about actual generation — filtered out for training, the same
    choice the reference train_model.py in hardware/raspberry-pi makes for
    the anomaly model."""
    return df[df["light_lux"].fillna(0) > cfg.DAYLIGHT_LUX_THRESHOLD].copy()


def build_forecast_dataset(df: pd.DataFrame):
    """Returns (X, y) for training a same-timestamp power regressor:
    given current conditions, predict current power_mw. Used both to fit the
    model and, at inference time, to turn a forecast weather/light input into
    a power estimate."""
    df = add_time_features(df)
    df = daylight_only(df)
    df = df.dropna(subset=["power_mw", "light_lux"])
    X = df[BASE_FEATURE_COLUMNS].fillna(df[BASE_FEATURE_COLUMNS].median(numeric_only=True))
    y = df["power_mw"]
    return X, y


def build_anomaly_dataset(df: pd.DataFrame):
    """Isolation Forest trains on daylight rows only (same rationale as
    hardware/raspberry-pi/train_model.py) so 'it's dark' is never flagged as
    an anomaly."""
    df = daylight_only(df)
    df = df.dropna(subset=ANOMALY_FEATURE_COLUMNS)
    return df[ANOMALY_FEATURE_COLUMNS]

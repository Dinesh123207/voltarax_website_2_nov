"""
All tunables in one place, read from the environment (see ai-engine/.env.example).
Nothing here talks to Firebase yet — see data/ingest.py.
"""
import os
import re
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent
ARTIFACTS_DIR = ROOT / "artifacts"
ARTIFACTS_DIR.mkdir(exist_ok=True)

SITE_ID = os.environ.get("SOLAR_SITE_ID", "solar_site")
if not re.fullmatch(r'[A-Za-z0-9_-]{1,64}', SITE_ID):
    raise ValueError('SOLAR_SITE_ID must be a valid site identifier')

# ---- Firebase ---------------------------------------------------------------
FIREBASE_DATABASE_URL = os.environ.get("FIREBASE_DATABASE_URL", "")
FIREBASE_SERVICE_ACCOUNT_JSON = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")
FIREBASE_SERVICE_ACCOUNT_FILE = os.environ.get("FIREBASE_SERVICE_ACCOUNT_FILE", "")

# ---- Data-readiness thresholds -----------------------------------------------
# These are deliberately conservative defaults, not a claim about how much data
# any specific model "needs" — tune them once you can see your own data volume
# and forecast error. A model only (re)trains once its threshold is met; below
# it, the pipeline reports "not enough data yet" rather than training on too
# little and publishing a confidently wrong prediction.
MIN_ROWS_ANOMALY = int(os.environ.get("AI_MIN_ROWS_ANOMALY", 500))       # ~8-12 hrs at 1/min
MIN_DAYLIGHT_ROWS_FORECAST = int(os.environ.get("AI_MIN_DAYLIGHT_ROWS_FORECAST", 300))
MIN_ROWS_HEALTH_BASELINE = int(os.environ.get("AI_MIN_ROWS_HEALTH_BASELINE", 200))
DAYLIGHT_LUX_THRESHOLD = float(os.environ.get("AI_DAYLIGHT_LUX_THRESHOLD", 2000))

# Retrain only if this many NEW rows have arrived since the last training run,
# so the scheduler can run hourly without retraining on an unchanged dataset.
MIN_NEW_ROWS_TO_RETRAIN = int(os.environ.get("AI_MIN_NEW_ROWS_TO_RETRAIN", 100))

# ---- History pull limits -----------------------------------------------------
MAX_HISTORY_ROWS = int(os.environ.get("AI_MAX_HISTORY_ROWS", 50000))  # safety cap

# Panel spec, mirrors backend/.env.example — used by the health baseline model.
PANEL_PMAX_W = float(os.environ.get("SOLAR_PANEL_PMAX_W", 10))
TEMP_COEFF = float(os.environ.get("SOLAR_TEMP_COEFF", -0.004))
NOCT_C = float(os.environ.get("SOLAR_NOCT_C", 45))
LUX_PER_WM2 = float(os.environ.get("SOLAR_LUX_PER_WM2", 120))

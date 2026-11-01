"""
Tiny shared base class. Not a framework — just enough so
pipeline/orchestrator.py can loop over models generically instead of having
one bespoke branch per model.
"""
import json
import time
from pathlib import Path

import joblib

import config as cfg


class BaseModel:
    name: str = "base"

    def __init__(self):
        self.estimator = None
        self.metadata = {}

    # -- implemented per model --------------------------------------------
    def fit(self, df):
        raise NotImplementedError

    def predict(self, df):
        raise NotImplementedError

    # -- shared -------------------------------------------------------------
    @property
    def artifact_path(self) -> Path:
        return cfg.ARTIFACTS_DIR / f"{self.name}.joblib"

    @property
    def metadata_path(self) -> Path:
        return cfg.ARTIFACTS_DIR / f"{self.name}.meta.json"

    def save(self):
        joblib.dump(self.estimator, self.artifact_path)
        self.metadata_path.write_text(json.dumps(self.metadata, indent=2))

    def load(self) -> bool:
        if not self.artifact_path.exists():
            return False
        self.estimator = joblib.load(self.artifact_path)
        if self.metadata_path.exists():
            self.metadata = json.loads(self.metadata_path.read_text())
        return True

    def is_trained(self) -> bool:
        return self.estimator is not None or self.artifact_path.exists()

    def _stamp_metadata(self, **extra):
        self.metadata = {
            "model": self.name,
            "trained_at": int(time.time()),
            **extra,
        }

import sys
from pathlib import Path
import time
import json

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config as cfg
from models.health.performance_ratio_model import HealthBaselineModel
from test_evaluation import sample_frame


def test_versioned_models_roundtrip_preserve_versions_and_reject_corruption(tmp_path, monkeypatch):
    monkeypatch.setattr(cfg, 'ARTIFACTS_DIR', tmp_path)
    model = HealthBaselineModel().fit(sample_frame())
    model.save()
    assert model.manifest_path.exists() and model.artifact_path.exists() and model.metadata_path.exists()
    loaded = HealthBaselineModel()
    assert loaded.load() and loaded.baseline_pr() == model.baseline_pr()
    first_path = model.artifact_path
    newer = sample_frame(); newer['ts'] += 86400
    newer['power_mw'] *= 0.8
    HealthBaselineModel().fit(newer).save()
    assert first_path.exists()  # immutable prior artifact survives manifest updates
    with pytest.raises(ValueError, match='Older candidate'):
        model.save()
    current = HealthBaselineModel(); assert current.load()
    manifest = current.manifest_path.read_text()
    mixed = json.loads(manifest); mixed['model_sha256'] = model.metadata['artifact_sha256']
    current.manifest_path.write_text(json.dumps(mixed))
    assert HealthBaselineModel().load() is False
    current.manifest_path.write_text(manifest)
    current.artifact_path.write_bytes(b'synthetic-corrupt-owned-test-file')
    assert HealthBaselineModel().load() is False


def test_legacy_models_are_preserved_without_unpickling_and_models_expire(tmp_path, monkeypatch):
    monkeypatch.setattr(cfg, 'ARTIFACTS_DIR', tmp_path)
    legacy = tmp_path / 'health_baseline.joblib'; legacy.write_bytes(b'not-a-trusted-pickle')
    model = HealthBaselineModel()
    assert not model.load() and model.load_state == 'legacy_unverified'
    assert legacy.read_bytes() == b'not-a-trusted-pickle'
    model.fit(sample_frame()).save()
    stamp = model.metadata['trained_at']
    monkeypatch.setattr(time, 'time', lambda: stamp + cfg.MAX_MODEL_AGE_SECONDS + 1)
    expired = HealthBaselineModel()
    assert not expired.load() and expired.load_state == 'expired'


def test_model_runtime_mismatch_is_rejected(tmp_path, monkeypatch):
    monkeypatch.setattr(cfg, 'ARTIFACTS_DIR', tmp_path)
    HealthBaselineModel().fit(sample_frame()).save()
    import models.base as base
    actual = base.versions()
    monkeypatch.setattr(base, 'versions', lambda: {**actual, 'sklearn': 'incompatible-test-version'})
    assert HealthBaselineModel().load() is False


def test_model_site_device_and_parameter_boundaries_are_preserved(tmp_path, monkeypatch):
    monkeypatch.setattr(cfg, 'ARTIFACTS_DIR', tmp_path)
    model = HealthBaselineModel().fit(sample_frame()); model.save()
    from pipeline.validation import valid_metadata
    with monkeypatch.context() as scoped:
        scoped.setattr(cfg, 'SITE_ID', 'another-site')
        assert not valid_metadata(model.metadata, model.name)
        assert not HealthBaselineModel().load()
    with monkeypatch.context() as scoped:
        scoped.setattr(cfg, 'PANEL_PMAX_W', cfg.PANEL_PMAX_W * 2)
        assert not valid_metadata(model.metadata, model.name)
    assert model.artifact_path.exists()


def test_synthetic_training_cannot_replace_a_device_history_manifest(tmp_path, monkeypatch):
    monkeypatch.setattr(cfg, 'ARTIFACTS_DIR', tmp_path)
    real = HealthBaselineModel().fit(sample_frame()); real.save()
    manifest = real.manifest_path.read_bytes()
    fake = sample_frame(); fake['simulated'] = True; fake['ts'] += 86400
    synthetic = HealthBaselineModel().fit(fake); synthetic.save()
    assert synthetic.manifest_path != real.manifest_path
    assert real.manifest_path.read_bytes() == manifest
    assert HealthBaselineModel().load()
    assert HealthBaselineModel(origin='synthetic-test-inputs').load()

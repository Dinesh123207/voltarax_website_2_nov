"""Validated, versioned local model artifacts; legacy files are preserved."""
import hashlib
import io
import json
import logging
import os
from pathlib import Path
import platform
import re
import time
from uuid import uuid4

import joblib
import numpy
import pandas
import sklearn
import config as cfg
from pipeline.validation import valid_metadata, training_parameters

log = logging.getLogger('ai_engine.artifacts')


def versions():
    return {'python': platform.python_version(), 'numpy': numpy.__version__,
            'pandas': pandas.__version__, 'sklearn': sklearn.__version__, 'joblib': joblib.__version__}


class BaseModel:
    name = 'base'

    def __init__(self, origin='device-history-unverified-calibration'):
        if origin not in {'synthetic-test-inputs', 'device-history-unverified-calibration'}:
            raise ValueError('Invalid model origin')
        self.origin = origin
        self.estimator = None
        self.metadata = {}
        self.load_state = 'missing'
        self._metadata_digest = 'untrained'

    @property
    def directory(self):
        return cfg.ARTIFACTS_DIR / 'validated' / cfg.SITE_ID / cfg.DEVICE_ID / self.origin / self.name

    @property
    def manifest_path(self):
        return self.directory / 'current.json'

    @property
    def artifact_path(self):
        return self.directory / (self.metadata.get('artifact_sha256', 'untrained') + '.joblib')

    @property
    def metadata_path(self):
        return self.directory / (self._metadata_digest + '.json')

    def fit(self, df):
        raise NotImplementedError

    def predict(self, df):
        raise NotImplementedError

    @staticmethod
    def _exclusive(path, content):
        try:
            with path.open('xb') as stream:
                stream.write(content)
        except FileExistsError:
            if path.read_bytes() != content:
                raise ValueError('Artifact collision; existing data was preserved')

    def save(self):
        if self.estimator is None or self.metadata.get('data_origin') != self.origin or self.metadata.get('library_versions') != versions() or not valid_metadata(self.metadata, self.name):
            raise ValueError('Only validated fresh models can be saved')
        self.directory.mkdir(parents=True, exist_ok=True)
        # OS lock prevents overlapping schedulers replacing a newer manifest.
        with (self.directory / 'writer.lock').open('a+b') as lock:
            if lock.tell() == 0:
                lock.write(b'0'); lock.flush()
            lock.seek(0)
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            try:
                previous = type(self)(origin=self.origin)
                previous.load()
                if previous.metadata.get('source_window_end_ts', 0) > self.metadata['source_window_end_ts']:
                    raise ValueError('Older candidate cannot replace a newer source window')
                buffer = io.BytesIO(); joblib.dump(self.estimator, buffer, compress=3)
                content = buffer.getvalue(); digest = hashlib.sha256(content).hexdigest()
                self.metadata['artifact_sha256'] = digest
                encoded = json.dumps(self.metadata, sort_keys=True, allow_nan=False).encode('utf-8')
                meta_digest = hashlib.sha256(encoded).hexdigest()
                self._exclusive(self.directory / (digest + '.joblib'), content)
                self._exclusive(self.directory / (meta_digest + '.json'), encoded)
                manifest = {'schema_version': 2, 'model_sha256': digest, 'metadata_sha256': meta_digest}
                temporary = self.directory / (uuid4().hex + '.tmp')
                with temporary.open('x', encoding='utf-8') as stream:
                    json.dump(manifest, stream)
                os.replace(temporary, self.manifest_path)
                self._metadata_digest = meta_digest
                self.load_state = 'ready'
            finally:
                lock.seek(0)
                if os.name == 'nt':
                    msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)
                else:
                    fcntl.flock(lock, fcntl.LOCK_UN)

    def load(self):
        self.estimator = None; self.metadata = {}; self.load_state = 'missing'; self._metadata_digest = 'untrained'
        if not self.manifest_path.exists():
            # Older arbitrary joblib files are not loaded or removed.
            if (cfg.ARTIFACTS_DIR / (self.name + '.joblib')).exists():
                self.load_state = 'legacy_unverified'
            return False
        try:
            if self.manifest_path.stat().st_size > 1000:
                raise ValueError('Manifest size')
            manifest = json.loads(self.manifest_path.read_text(encoding='utf-8'))
            if manifest.get('schema_version') != 2:
                raise ValueError('Manifest version')
            for key in ['model_sha256', 'metadata_sha256']:
                if not re.fullmatch('[a-f0-9]{64}', str(manifest.get(key, ''))):
                    raise ValueError('Artifact identifier')
            model_path = self.directory / (manifest['model_sha256'] + '.joblib')
            meta_path = self.directory / (manifest['metadata_sha256'] + '.json')
            if model_path.stat().st_size > 50 * 1024 * 1024 or meta_path.stat().st_size > 200000:
                raise ValueError('Artifact size')
            content, encoded = model_path.read_bytes(), meta_path.read_bytes()
            if hashlib.sha256(content).hexdigest() != manifest['model_sha256'] or hashlib.sha256(encoded).hexdigest() != manifest['metadata_sha256']:
                raise ValueError('Artifact hash mismatch')
            metadata = json.loads(encoded)
            if metadata.get('artifact_sha256') != manifest['model_sha256']:
                raise ValueError('Model/metadata binding mismatch')
            if metadata.get('data_origin') != self.origin or metadata.get('library_versions') != versions() or not valid_metadata(metadata, self.name, check_age=False):
                raise ValueError('Artifact schema or runtime mismatch')
            self.metadata = metadata
            self._metadata_digest = manifest['metadata_sha256']
            if not valid_metadata(metadata, self.name):
                self.load_state = 'expired'; return False
            # Trusted local artifacts only. Hash checks do not authenticate hostile pickle files.
            self.estimator = joblib.load(io.BytesIO(content))
            self.load_state = 'ready'; return True
        except Exception:  # corrupt/incompatible trusted artifacts fail closed, without printing their contents
            self.metadata = {}; self.estimator = None; self.load_state = 'invalid'
            log.warning('Model artifact unavailable; no unverified model was used')
            return False

    def is_trained(self):
        return self.estimator is not None and self.metadata.get('data_origin') == self.origin and valid_metadata(self.metadata, self.name)

    def _stamp_metadata(self, **extra):
        self.origin = extra.get('data_origin', self.origin)
        base = {'schema_version': 2, 'model': self.name, 'site_id': cfg.SITE_ID, 'device_id': cfg.DEVICE_ID,
                'trained_at': int(time.time()), 'library_versions': versions(), 'training_parameters': training_parameters(), **extra}
        if 'model_version' not in base:
            identity = hashlib.sha256(json.dumps(base, sort_keys=True, allow_nan=False).encode()).hexdigest()[:16]
            base['model_version'] = self.name + '-v2-' + identity
        self.metadata = base

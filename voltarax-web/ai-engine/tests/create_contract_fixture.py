"""Explicit offline synthetic contract fixture; no Firebase/network access."""
import json
from pathlib import Path
import sys
import tempfile
import time
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config as cfg
import test_pipeline_synthetic as fixtures
from pipeline.orchestrator import run

raw = fixtures.make_synthetic_history(days=10)
stamp = max(row['ts'] for row in raw.values()) + 1
time.time = lambda: stamp
with tempfile.TemporaryDirectory(prefix='contract-', dir=cfg.ROOT.parents[1] / '.local-tools') as directory:
    cfg.ARTIFACTS_DIR = Path(directory)
    writer = fixtures.FakeWriter()
    result = run(reader=lambda: raw, writer=writer)
    assert not result.errors and all(row['status'] == 'ok' for row in result.published.values())
    payloads = {key.rsplit('/', 1)[-1]: value for key, value in writer.store.items()}
    output = cfg.ROOT.parents[1] / 'docs/test-results/phase06-model-contract-fixture.json'
    output.write_text(json.dumps({'now': stamp, 'payloads': payloads, 'notice': 'Synthetic generated inputs only; no field accuracy'}, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    print('Offline synthetic model publication contract generated; no database access.')

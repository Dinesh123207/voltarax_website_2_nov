"""Standalone official-SDK demo regression; refuses every non-local target."""
import os
from pathlib import Path
import sys
import tempfile
import time
import json

if os.environ.get('FIREBASE_DATABASE_EMULATOR_HOST') != '127.0.0.1:9000' or os.environ.get('FIREBASE_PROJECT_ID') != 'demo-voltarax' or os.environ.get('NODE_ENV') != 'test':
    raise SystemExit('Requires the isolated localhost demo emulator')
os.environ['AI_PUBLISH_ENABLED'] = 'true'
os.environ['AI_REMOTE_ACCESS_ENABLED'] = 'false'
os.environ['SOLAR_SITE_ID'] = 'solar_site'
os.environ['SOLAR_DEVICE_ID'] = 'nodemcu-01'
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import config as cfg
import requests
from data.ingest import _get_firebase_app
from firebase_admin import db, delete_app
from pipeline.orchestrator import run
from pipeline.publish import publish

cfg.ARTIFACTS_DIR = Path(tempfile.mkdtemp(prefix='ai-emulator-', dir=cfg.ROOT.parents[1] / '.local-tools'))
# Deliberately invalid placeholders prove demo mode does not parse real credentials.
cfg.FIREBASE_SERVICE_ACCOUNT_JSON = 'synthetic-invalid-placeholder'
cfg.FIREBASE_SERVICE_ACCOUNT_FILE = 'synthetic-nonexistent-file'
cfg.FIREBASE_DATABASE_URL = 'https://invalid.example.test'
app = _get_firebase_app()
try:
    rules = (cfg.ROOT.parent / 'firebase.rules.json').read_text(encoding='utf-8')
    response = requests.put('http://127.0.0.1:9000/.settings/rules.json?ns=demo-voltarax',
                            headers={'Authorization': 'Bearer owner', 'Content-Type': 'application/json'},
                            data=rules.encode('utf-8'), timeout=60)
    response.raise_for_status()
    stamp = int(time.time())
    reading = {'ts': stamp, 'site_id': cfg.SITE_ID, 'device_id': cfg.DEVICE_ID, 'power_mw': 5000, 'light_lux': 50000,
               'temp_c': 25, 'humidity_pct': 50, 'dust_ugm3': 30, 'current_ma': 417, 'voltage_v': 12,
               'simulated': True, 'sensors_ok': {'ina219': True, 'bh1750': True, 'dht11': True, 'dust': True}}
    db.reference('/readings/solar_site/synthetic-sdk-test', app=app).set(reading)
    db.reference('/sites/solar_site/latest', app=app).set(reading)
    result = run()
    assert result.total_rows == 1 and not result.trained
    value = db.reference('/sites/solar_site/ai/forecast', app=app).get()
    assert value['schema_version'] == 2 and value['status'] == 'not_enough_data' and value['source_ts'] == stamp
    assert value['dataQuality'] == 'Unavailable' and 'predicted_power_mw' not in value
    assert db.reference('/solar_site/ai', app=app).get() is None
    contract = {'now': int(time.time()), 'payloads': db.reference('/sites/solar_site/ai', app=app).get()}
    output = cfg.ROOT.parents[1] / 'docs/test-results/phase06-sdk-contract-fixture.json'
    output.write_text(json.dumps(contract, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    try:
        publish('health', {'status': 'ok', 'source_ts': stamp, 'data_origin': 'synthetic-test-inputs', 'baseline_pr': float('nan')})
        raise AssertionError('Invalid payload was accepted')
    except ValueError:
        pass
    print('Official Python SDK demo read/publication passed; canonical paths and invalid-result refusal verified. No live project or real credentials used.')
finally:
    delete_app(app)

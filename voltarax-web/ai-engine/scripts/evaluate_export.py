"""Evaluate a reviewed local telemetry export. Never connects to Firebase."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import pandas as pd
import config as cfg
from data.ingest import raw_history_to_frame
from evaluation import fit_power, evaluate_anomaly


def load_export(path):
    if path.stat().st_size > 20 * 1024 * 1024:
        raise ValueError('Local export exceeds 20 MB; prepare a bounded reviewed export')
    if path.suffix.lower() == '.csv':
        raw = {str(index): row for index, row in enumerate(pd.read_csv(path).to_dict('records'))}
    else:
        data = json.loads(path.read_text(encoding='utf-8-sig'))
        if isinstance(data, dict) and 'readings' in data:
            raw = data['readings'].get(cfg.SITE_ID, {})
        elif isinstance(data, dict) and 'solar_site' in data:
            raw = data['solar_site'].get('history', {})
        elif isinstance(data, list):
            raw = {str(index): row for index, row in enumerate(data)}
        else:
            raw = data
    if not isinstance(raw, dict) or len(raw) > cfg.MAX_HISTORY_ROWS:
        raise ValueError('Export must contain a bounded map/list of readings')
    frame = raw_history_to_frame(raw)
    frame = frame[(frame['site_id'] == cfg.SITE_ID) & (frame['device_id'] == cfg.DEVICE_ID)].copy()
    return frame, hashlib.sha256(path.read_bytes()).hexdigest()


def evaluate(frame, synthetic=False):
    origin = 'synthetic-test-inputs' if synthetic or ('simulated' in frame and bool(frame['simulated'].fillna(False).any())) else 'reviewed-local-export-unverified-calibration'
    try:
        _, power, _ = fit_power(frame)
    except ValueError:
        power = {'status': 'insufficient_data', 'model': None, 'baseline': None, 'accepted': False,
                 'reason': 'At least 100 complete daylight rows and 20 chronological validation rows, with a usable engineering baseline, are required.'}
    return {'schema_version': 2, 'data_origin': origin, 'rows': len(frame), 'power': power, 'anomaly': evaluate_anomaly(frame),
            'dataQuality': 'Estimated' if origin == 'synthetic-test-inputs' else 'Calculated',
            'limitations': 'Offline current-condition evaluation only. No real-site accuracy, future weather skill, verified fault taxonomy or confidence interval is established.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--synthetic', action='store_true', help='Explicitly identify generated test inputs')
    args = parser.parse_args()
    output = args.output.resolve()
    allowed = [cfg.ARTIFACTS_DIR.resolve(), (cfg.ROOT.parents[1] / 'docs/test-results').resolve()]
    if output.suffix != '.json' or not any(output.is_relative_to(root) for root in allowed):
        raise ValueError('Output must be a JSON file under AI artifacts or workspace docs/test-results')
    frame, digest = load_export(args.input)
    result = {**evaluate(frame, args.synthetic), 'input_sha256': digest}
    encoded = json.dumps(result, indent=2, allow_nan=False)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('x', encoding='utf-8') as stream:
        stream.write(encoded + '\n')
    print(json.dumps({'rows': len(frame), 'power_status': result['power']['status'], 'data_origin': result['data_origin'], 'database_access': False}))
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, OSError, KeyError, TypeError):
        print('Evaluation refused or unavailable. Review the local export, identities, output path and required columns; existing outputs are never overwritten.', file=sys.stderr)
        raise SystemExit(2)

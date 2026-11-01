"""Check feature shift against validated training references; no writes by default."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config as cfg
from data.ingest import fetch_history
from pipeline.drift import assess, eligible, METHOD, MINIMUM_ROWS, THRESHOLD
from pipeline.orchestrator import _source
from pipeline.publish import publish
from models.forecast.gradient_boosting_forecaster import ForecastModel
from models.anomaly.isolation_forest_detector import AnomalyModel
from models.health.performance_ratio_model import HealthBaselineModel


def build_report(frame, models=None):
    context, state = _source(frame)
    if models is None:
        models = {name: cls(origin=context['data_origin']) for name, cls in [('forecast', ForecastModel), ('anomaly', AnomalyModel), ('health', HealthBaselineModel)]}
        for model in models.values():
            model.load()
    rows = {}
    for name, model in models.items():
        meta = model.metadata if model.is_trained() and model.origin == context['data_origin'] else {}
        data = eligible(frame, model.name) if len(frame) and meta else frame.iloc[:0]
        rows[name] = assess(data, meta)
    return {**context, 'status': state, 'method': METHOD, 'threshold': THRESHOLD, 'minimum_rows': MINIMUM_ROWS, 'models': rows,
            'note': 'Feature-distribution shift is a review heuristic, not accuracy or a confirmed fault. Retraining still needs eligible new rows and candidate validation. Missing references/new rows remain unavailable.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, help='Bounded reviewed local export; never connects to Firebase')
    parser.add_argument('--output', type=Path, help='New JSON under artifacts or docs/test-results')
    parser.add_argument('--publish', action='store_true', help='Explicit configured publication; not allowed with offline input')
    args = parser.parse_args()
    if args.input and args.publish:
        raise ValueError('Offline snapshots cannot be republished as current drift')
    if args.input:
        from scripts.evaluate_export import load_export
        frame, _ = load_export(args.input)
    else:
        frame = fetch_history()
    report = build_report(frame)
    # Use the exact publication schema even when no database writer is enabled.
    value = publish('drift', report, writer=None if args.publish else lambda *_: None)
    if args.output:
        output = args.output.resolve()
        roots = [cfg.ARTIFACTS_DIR.resolve(), (cfg.ROOT.parents[1] / 'docs/test-results').resolve()]
        if output.suffix != '.json' or not any(output.is_relative_to(root) for root in roots):
            raise ValueError('Drift output must remain within artifact/test-result directories')
        output.parent.mkdir(parents=True, exist_ok=True)
        with output.open('x', encoding='utf-8') as stream:
            stream.write(json.dumps(value, indent=2, allow_nan=False) + '\n')
    print(json.dumps({'status': value['status'], 'models': {name: row['status'] for name, row in value['models'].items()}, 'database_publication': args.publish}))
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception:
        print('Drift check unavailable/refused. Review mode, export, validated references and output path; no private values logged.', file=sys.stderr)
        raise SystemExit(2)

"""Bounded current-input inference using already validated model artifacts."""
import logging
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def main():
    from data.ingest import latest_reader
    from pipeline.orchestrator import run
    try:
        result = run(reader=latest_reader, train=False)
    except Exception:
        logging.error('AI inference unavailable; review explicit mode/service configuration without logging credentials')
        return 1
    return 1 if result.errors else 0


if __name__ == '__main__':
    raise SystemExit(main())

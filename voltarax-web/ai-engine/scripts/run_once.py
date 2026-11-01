#!/usr/bin/env python3
"""
Usage:
    cd ai-engine && python scripts/run_once.py

Run this on a schedule (see schedule_cron.md). Exits 0 even when there isn't
enough data yet — "nothing to do yet" is a normal, expected outcome, not a
failure. Exits 1 only if the run itself couldn't complete (e.g. Firebase is
unreachable).
"""
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("ai_engine.run_once")


def main():
    from pipeline.orchestrator import run

    try:
        result = run()
    except Exception:
        log.exception("Pipeline run failed")
        return 1

    log.info("Rows seen: %d", result.total_rows)
    if result.trained:
        log.info("Trained: %s", ", ".join(result.trained))
    if result.skipped:
        for name, reason in result.skipped:
            log.info("Skipped %s: %s", name, reason)
    if result.errors:
        for key, msg in result.errors.items():
            log.error("%s: %s", key, msg)
    return 0


if __name__ == "__main__":
    sys.exit(main())

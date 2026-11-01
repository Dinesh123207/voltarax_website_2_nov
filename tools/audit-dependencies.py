"""CI-ready production audit; audit errors and high/critical advisories fail the gate."""
import json
from pathlib import Path
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parent.parent
failed = False
for service in ('frontend', 'backend'):
    cwd = root / 'voltarax-web' / service
    try:
        result = subprocess.run([shutil.which('npm') or 'npm', 'audit', '--omit=dev', '--audit-level=high', '--json'], cwd=cwd, capture_output=True, text=True, timeout=600)
        audit = json.loads(result.stdout)
        out = root / f'docs/test-results/{service}-production-audit-current.json'
        out.write_text(json.dumps(audit, indent=2), encoding='utf-8')
        counts = audit.get('metadata', {}).get('vulnerabilities')
        if counts is None or audit.get('error'):
            print(f'{service}: audit could not complete'); failed = True
        else:
            print(f'{service}: {json.dumps(counts)}')
            failed |= result.returncode != 0 or counts.get('high', 0) > 0 or counts.get('critical', 0) > 0
    except (subprocess.TimeoutExpired, ValueError, OSError):
        print(f'{service}: audit failed or exceeded 600 seconds'); failed = True
sys.exit(bool(failed))

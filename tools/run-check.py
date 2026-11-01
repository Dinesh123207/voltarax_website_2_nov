"""Run a local check with a ten-minute ceiling and retain its actual output."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time

p = argparse.ArgumentParser()
p.add_argument('--cwd', required=True)
p.add_argument('--name', required=True)
p.add_argument('command', nargs=argparse.REMAINDER)
a = p.parse_args()
command = a.command[1:] if a.command[:1] == ['--'] else a.command
if os.name == 'nt' and command[0] in ('npm', 'npx'):
    command[0] += '.cmd'
root = Path(__file__).resolve().parent.parent
out = root / 'docs' / 'test-results'
out.mkdir(parents=True, exist_ok=True)
started = time.time()
with (out / f'{a.name}.log').open('w', encoding='utf-8') as log:
    try:
        process = subprocess.Popen(command, cwd=a.cwd, stdout=log, stderr=subprocess.STDOUT)
        code = process.wait(timeout=600)
    except subprocess.TimeoutExpired:
        if os.name == 'nt':
            subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], stdout=log, stderr=subprocess.STDOUT)
        else:
            process.kill()
        process.wait()
        log.write('\nTIMEOUT after 600 seconds\n')
        code = 124
report = {'command': command, 'cwd': a.cwd, 'exit_code': code, 'seconds': round(time.time() - started, 2)}
(out / f'{a.name}.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
sys.exit(code)

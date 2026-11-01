"""Run a cached official database emulator without loading the full Firebase CLI.

This launcher binds loopback only, uses a demo project and owns/cleans its JVM.
The child test must enforce its own demo guard and install the test rules.
"""
import argparse
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time

p = argparse.ArgumentParser()
p.add_argument('--log', required=True)
p.add_argument('command', nargs=argparse.REMAINDER)
a = p.parse_args()
command = a.command[1:] if a.command[:1] == ['--'] else a.command
root = Path(__file__).resolve().parent.parent
jar = Path.home() / '.cache/firebase/emulators/firebase-database-emulator-v4.11.2.jar'
if not command or not jar.is_file() or not shutil.which('java'):
    raise SystemExit('Requires Java and the official emulator cached by the Firebase CLI')
try:
    with socket.create_connection(('127.0.0.1', 9000), timeout=1):
        raise SystemExit('Local port 9000 is already occupied; no process was stopped')
except (ConnectionRefusedError, TimeoutError, OSError):
    pass
env = os.environ.copy()
env.update(FIREBASE_DATABASE_EMULATOR_HOST='127.0.0.1:9000', FIREBASE_PROJECT_ID='demo-voltarax', GCLOUD_PROJECT='demo-voltarax', NODE_ENV='test')
for key in ('JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS'):
    env.pop(key, None)
log_path = (root / a.log).resolve()
if not log_path.is_relative_to((root / 'docs/test-results').resolve()):
    raise SystemExit('Emulator log must stay under docs/test-results')
log_path.parent.mkdir(parents=True, exist_ok=True)
code = 1
with log_path.open('w', encoding='utf-8') as log:
    emulator = subprocess.Popen([shutil.which('java'), '-Xms32m', '-Xmx256m', '-XX:ActiveProcessorCount=2', '-jar', str(jar), '--host', '127.0.0.1', '--port', '9000'], env=env, stdout=log, stderr=subprocess.STDOUT)
    try:
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            if emulator.poll() is not None: raise RuntimeError('Local emulator exited during startup')
            try:
                with socket.create_connection(('127.0.0.1', 9000), timeout=1): break
            except (ConnectionRefusedError, TimeoutError, OSError): time.sleep(0.2)
        else: raise RuntimeError('Local emulator startup timed out')
        code = subprocess.run(command, env=env, timeout=480).returncode
    except (RuntimeError, subprocess.TimeoutExpired):
        print('Local emulator check failed or timed out; inspect the saved server log')
    finally:
        emulator.terminate()
        try: emulator.wait(timeout=5)
        except subprocess.TimeoutExpired: emulator.kill(); emulator.wait()
sys.exit(code)

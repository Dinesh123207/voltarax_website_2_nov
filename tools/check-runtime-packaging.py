"""Check local Docker COPY inputs and import the staged AI runtime, offline.

This checks tracked build inputs and Python imports, not an actual Docker image.
It never loads service .env files or runs a product entry point.
"""
import fnmatch
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import uuid

ROOT = Path(__file__).resolve().parents[1]
tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
stage = ROOT / '.local-tools' / 'packaging' / uuid.uuid4().hex
errors = []
inputs = {}
for service in ('frontend', 'backend', 'ai-engine'):
    context = ROOT / 'voltarax-web' / service
    paths = [Path(name).relative_to(context.relative_to(ROOT)).as_posix()
             for name in tracked if name.startswith(context.relative_to(ROOT).as_posix() + '/')]
    excluded = [line.strip() for line in (context / '.dockerignore').read_text().splitlines()
                if line.strip() and not line.startswith('#')]
    def included(name):
        allow = True
        for rule in excluded:
            negate = rule.startswith('!')
            pattern = rule.lstrip('!').rstrip('/')
            if any(fnmatch.fnmatch(part, pattern) for part in name.split('/')) or fnmatch.fnmatch(name, pattern):
                allow = negate
        return allow
    inputs[service] = []
    for line in (context / 'Dockerfile').read_text().splitlines():
        if not line.startswith('COPY ') or '--from=' in line:
            continue
        parts = [part for part in shlex.split(line)[1:] if not part.startswith('--')]
        destination = parts[-1].removeprefix('./')
        for source in parts[:-1]:
            matches = [name for name in paths if included(name) and (source == '.' or name == source or name.startswith(source.rstrip('/') + '/'))]
            if not matches:
                errors.append(f'{service}: COPY {source} has no tracked, included build inputs')
            inputs[service].append({'source': source, 'files': len(matches)})
            if service == 'ai-engine':
                for name in matches:
                    relative = name if source == '.' else str(Path(name).relative_to(source)) if name != source else ''
                    target = stage / destination / relative if relative else stage / destination
                    if destination in ('.', '') or destination.endswith('/'):
                        target = stage / destination / (relative or Path(name).name)
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(context / name, target)

# The packaged backend must support the guarded operator commands it advertises.
backend_copies = {entry['source'] for entry in inputs['backend']}
for script in ('server.js', 'scripts/migrate-relational.js', 'scripts/seed.js'):
    if not any(source == '.' or script == source or script.startswith(source.rstrip('/') + '/') for source in backend_copies):
        errors.append(f'backend: required operator/runtime entry point {script} is not packaged')

python = ROOT / '.local-tools/ai-python/Scripts/python.exe' if os.name == 'nt' else Path(sys.executable)
if not python.is_file():
    raise SystemExit('Use the installed AI environment to check runtime imports')
env = {key: value for key, value in os.environ.items() if not key.startswith(('AI_', 'FIREBASE_', 'SOLAR_', 'GOOGLE_', 'PYTHON'))}
env.update(AI_REMOTE_ACCESS_ENABLED='false', AI_PUBLISH_ENABLED='false', PYTHONDONTWRITEBYTECODE='1')
code = "import sys,runpy; sys.path.insert(0,sys.argv[1]); import pipeline.orchestrator; [runpy.run_path('scripts/'+name, run_name='packaging_check') for name in ('predict_once.py','run_once.py','check_drift.py','evaluate_export.py')]; print('Staged runtime imports and batch entry points pass; no main function executed')"
result = subprocess.run([str(python), '-I', '-c', code, str(stage)], cwd=stage, env=env, capture_output=True, text=True, timeout=90)
if result.returncode:
    errors.append('ai-engine: staged runtime import failed')
report = {'scope': 'Tracked COPY inputs and isolated staged AI imports; no Docker engine/runtime assertion',
          'inputs': inputs, 'errors': errors, 'imports_exit_code': result.returncode,
          'imports_output': result.stdout + result.stderr, 'stage': stage.relative_to(ROOT).as_posix()}
print(json.dumps(report, indent=2))
raise SystemExit(bool(errors))

"""Conservative local source/Git scan; reports file names, never matched values."""
import json
from pathlib import Path
import re
import subprocess
import sys

root = Path(__file__).resolve().parent.parent
files = subprocess.check_output(['git', 'ls-files', '-co', '--exclude-standard'], cwd=root, text=True).splitlines()
patterns = [re.compile(r'AIza[0-9A-Za-z_-]{35}'), re.compile(r'gh[pousr]_[A-Za-z0-9]{20,}'),
            re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s+[A-Za-z0-9+/=]{40,}')]
findings = []
for name in sorted(set(files)):
    p = root / name
    if not p.is_file() or p.suffix.lower() in ('.pdf', '.png', '.jpg', '.mp4', '.zip'):
        continue
    if (p.name.startswith('.env') and not p.name.endswith('.example')) or p.name == 'secrets.h' or p.suffix in ('.pem', '.key', '.p12', '.pfx'):
        findings.append({'path': name, 'reason': 'secret file is not ignored'})
        continue
    try:
        value = p.read_text(encoding='utf-8-sig')
    except (UnicodeError, OSError):
        continue
    if any(pattern.search(value) for pattern in patterns): findings.append({'path': name, 'reason': 'possible credential pattern'})
result = {'files_checked': len(set(files)), 'findings': findings, 'limit': 'Pattern scan is not proof that every credential format is absent.'}
out = root / 'docs/test-results/secret-scan.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(result))
sys.exit(bool(findings))

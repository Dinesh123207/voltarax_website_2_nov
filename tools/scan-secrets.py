"""Conservative local source/Git scan; reports file names, never matched values."""
import json
from pathlib import Path
import re
import subprocess
import sys

root = Path(__file__).resolve().parent.parent
files = subprocess.check_output(['git', 'ls-files', '-co', '--exclude-standard'], cwd=root, text=True).splitlines()
patterns = [re.compile(r'AIza[0-9A-Za-z_-]{35}'), re.compile(r'gh[pousr]_[A-Za-z0-9]{20,}'),
            re.compile(r'github_pat_[A-Za-z0-9_]{40,}'),
            re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----(?:\s|\\n|\\r)+[A-Za-z0-9+/=]{40,}')]
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
if '--history' in sys.argv:
    objects = subprocess.check_output(['git','rev-list','--objects','--all'],cwd=root,text=True,encoding='utf-8').splitlines()
    named = {}
    for entry in objects:
        if ' ' not in entry: continue
        oid,name=entry.split(' ',1)
        if Path(name).suffix.lower() not in ('.pdf','.png','.jpg','.jpeg','.gif','.ico','.mp4','.zip','.woff','.woff2'):
            named[oid]=name
    batch = subprocess.run(['git','cat-file','--batch'],cwd=root,input=('\n'.join(named)+'\n').encode(),stdout=subprocess.PIPE,check=True).stdout
    position=0;checked=0;large=0
    for oid,name in named.items():
        end=batch.index(b'\n',position);header=batch[position:end].split();size=int(header[2]);position=end+1
        body=batch[position:position+size];position+=size+1
        if header[1]!=b'blob': continue
        if size>2*1024*1024:large+=1;continue
        checked+=1;value=body.decode('utf-8-sig',errors='ignore')
        secret_file=(Path(name).name.startswith('.env') and not Path(name).name.endswith('.example')) or Path(name).name=='secrets.h' or Path(name).suffix in ('.pem','.key','.p12','.pfx')
        if secret_file or any(pattern.search(value) for pattern in patterns): findings.append({'path':name,'object':oid,'reason':'possible historical credential pattern or secret file'})
    result.update(history_blobs_checked=checked,history_large_blobs_skipped=large)
out = root / ('docs/test-results/secret-scan-history.json' if '--history' in sys.argv else 'docs/test-results/secret-scan.json')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(result))
sys.exit(bool(findings))

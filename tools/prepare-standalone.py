"""Stage built public/static assets for local standalone-server checks; no deletion."""
from pathlib import Path
import shutil
import subprocess
root=Path(__file__).resolve().parents[1]
frontend=root/'voltarax-web/frontend';target=frontend/'.next/standalone'
def prepare():
    if not (target/'server.js').is_file():raise RuntimeError('Build standalone output first')
    subprocess.run([shutil.which('node'),str(frontend/'scripts/prepare-standalone.cjs')],cwd=frontend,check=True)
    return target
if __name__=='__main__':prepare();print('Built standalone public/static assets staged locally')

"""Stage built public/static assets for local standalone-server checks; no deletion."""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
frontend=root/'voltarax-web/frontend';target=frontend/'.next/standalone'
def prepare():
    if not (target/'server.js').is_file():raise RuntimeError('Build standalone output first')
    for source,destination in [(frontend/'public',target/'public'),(frontend/'.next/static',target/'.next/static')]:
        if not destination.resolve().is_relative_to(target.resolve()):raise RuntimeError('Unsafe build output target')
        shutil.copytree(source,destination,dirs_exist_ok=True)
    return target
if __name__=='__main__':prepare();print('Built standalone public/static assets staged locally')

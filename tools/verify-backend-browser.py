"""Actual local API+browser workflows. Called under run-local-database.py/run-check.py."""
import json,os,re,secrets,shutil,signal,socket,subprocess,sys,time,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]
if os.environ.get('FIREBASE_DATABASE_EMULATOR_HOST')!='127.0.0.1:9000' or os.environ.get('FIREBASE_PROJECT_ID')!='demo-voltarax':
    raise SystemExit('Requires the owned demo database wrapper')
label=os.environ.get('BACKEND_BROWSER_LABEL','phase10-backend-browser')
if not re.fullmatch('[a-z0-9-]{1,65}',label):raise SystemExit('Invalid result label')
for port in (38473,38475):
    with socket.socket() as probe:probe.bind(('127.0.0.1',port))
frontend=root/'voltarax-web/frontend'
manifest=json.loads((frontend/'.next/routes-manifest.json').read_text(encoding='utf-8'))
rewrites=manifest['rewrites']; routes=rewrites if isinstance(rewrites,list) else sum(rewrites.values(),[])
assert sum(route['source'] in ('/api/:path*','/health') for route in routes)==2
assert all(route['destination'].startswith('http://127.0.0.1:38475/') for route in routes if route['source'] in ('/api/:path*','/health')),'Build must target this owned fixture'
token=secrets.token_hex(32)
env={**os.environ,'E2E_FIXTURE_TOKEN':token,'E2E_BASE_URL':'http://localhost:38473','E2E_LABEL':label+'-browser','E2E_DEV':'false','NEXT_TELEMETRY_DISABLED':'1','NODE_OPTIONS':'--max-old-space-size=640','SITE_URL':'','PUBLIC_INDEXING_ENABLED':'false','PUBLIC_CONTENT_REVIEWED':'false'}
processes=[]
def wait_url(url,headers=None):
    deadline=time.monotonic()+150
    while time.monotonic()<deadline:
        if any(process.poll() is not None for process in processes):raise RuntimeError('Owned fixture exited; inspect its safe log')
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers=headers or {}),timeout=5) as response:
                if response.status==200:return
        except OSError:pass
        time.sleep(.4)
    raise RuntimeError('Owned fixture startup timed out')
try:
    with (root/f'docs/test-results/{label}-api.log').open('w',encoding='utf-8') as api_log, (root/f'docs/test-results/{label}-web.log').open('w',encoding='utf-8') as web_log:
        options={'creationflags':subprocess.CREATE_NEW_PROCESS_GROUP} if os.name=='nt' else {'start_new_session':True}
        processes.append(subprocess.Popen([shutil.which('node'),'tests/fixtures/e2e-server.cjs'],cwd=root/'voltarax-web/backend',env=env,stdout=api_log,stderr=subprocess.STDOUT,**options))
        wait_url('http://127.0.0.1:38475/api/__fixture/status',{'x-e2e-fixture':token})
        standalone=frontend/'.next/standalone'
        if (standalone/'server.js').is_file():
            subprocess.run([sys.executable,str(root/'tools/prepare-standalone.py')],check=True)
            command=[shutil.which('node'),str(standalone/'server.js')];server_cwd=standalone
        else:command=[shutil.which('node'),str(frontend/'node_modules/next/dist/bin/next'),'start','--hostname','localhost','--port','38473'];server_cwd=frontend
        processes.append(subprocess.Popen(command,cwd=server_cwd,env={**env,'HOSTNAME':'localhost','PORT':'38473'},stdout=web_log,stderr=subprocess.STDOUT,**options))
        wait_url('http://localhost:38473/login')
        command=[shutil.which('npm.cmd' if os.name=='nt' else 'npm'),'run','test:e2e','--','--grep','@backend']
        selected=os.environ.get('BACKEND_BROWSER_GREP')
        if selected: command[-1]='@backend '+selected
        result=subprocess.run(command,cwd=frontend,env=env,timeout=280)
        if result.returncode:raise RuntimeError('Actual-backend browser workflow failed; inspect browser evidence')
        report=json.loads((root/f'docs/test-results/{label}-browser.json').read_text(encoding='utf-8'));stats=report['stats']
        assert stats['expected']>0 and all(stats[key]==0 for key in ('unexpected','skipped','flaky'))
        def titles(suites):
            return [title for suite in suites for title in ([spec['title'] for spec in suite.get('specs',[])]+titles(suite.get('suites',[])))]
        summary={'browser_stats':stats,'passing_cases':titles(report['suites']),'actual_product_routes':True,'storage':'Owned demo RTDB; ephemeral PGlite initialized only for SQL cases','external_mail_gateway_hardware':'Fake sender, fake order/checkout and simulated GPIO acknowledgement only','real_service_assurance':False}
        (root/f'docs/test-results/{label}-fixture.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8');print(json.dumps(summary))
finally:
    for process in reversed(processes):
        if process.poll() is None:
            if os.name=='nt':process.terminate()
            else:os.killpg(process.pid,signal.SIGTERM)
            try:process.wait(timeout=5)
            except subprocess.TimeoutExpired:process.kill();process.wait()

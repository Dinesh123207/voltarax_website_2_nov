"""Exercise the real connected launcher only with an owned demo emulator."""
import http.cookiejar
import json
import os
from pathlib import Path
import secrets
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
if os.environ.get('FIREBASE_DATABASE_EMULATOR_HOST') != '127.0.0.1:9000' or os.environ.get('FIREBASE_PROJECT_ID') != 'demo-voltarax':
    raise SystemExit('Requires the owned loopback demo emulator')
for port in (3000, 5000):
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', port))
env = os.environ.copy()
env.update(JWT_SECRET=secrets.token_hex(48), OTP_SECRET=secrets.token_hex(48),
           FIREBASE_DATABASE_URL='', FIREBASE_SERVICE_ACCOUNT_JSON='', FIREBASE_CLIENT_EMAIL='',
           FIREBASE_PRIVATE_KEY='', GOOGLE_APPLICATION_CREDENTIALS='', DATABASE_URL='', REDIS_URL='',
           CHAT_PROVIDER='disabled', SOLAR_SITE_ID='solar_site', SOLAR_DEVICE_ID='simulator-01')
local_dir = ROOT / '.local-tools' / 'launcher'
local_dir.mkdir(parents=True, exist_ok=True)
log_dir = Path(tempfile.mkdtemp(prefix='connected-check-', dir=local_dir))
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def wait(url, child, seconds=180):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if child.poll() is not None:
            raise RuntimeError('Launcher stopped during connected-demo test')
        try:
            with opener.open(url, timeout=3) as response:
                if response.status == 200:
                    return json.load(response)
        except (OSError, ValueError, urllib.error.URLError):
            time.sleep(.4)
    raise RuntimeError('Timed out waiting for connected-demo service')


with (log_dir / 'launcher.log').open('w', encoding='utf-8') as log:
    rules = (ROOT / 'voltarax-web' / 'firebase.rules.json').read_bytes()
    rules_request = urllib.request.Request('http://127.0.0.1:9000/.settings/rules.json?ns=demo-voltarax',
                                          data=rules, method='PUT',
                                          headers={'Authorization': 'Bearer owner', 'Content-Type': 'application/json'})
    with opener.open(rules_request, timeout=15) as response:
        assert response.status == 200
    child = subprocess.Popen([sys.executable, '-u', str(ROOT / 'run-voltarax.py'), '--connected', '--no-browser'],
                             cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT,
                             creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0,
                             start_new_session=os.name != 'nt')
    try:
        health = wait('http://127.0.0.1:5000/health', child)
        assert health['status'] == 'ok' and health['testMode'] is True
        # Create only an in-memory demo account in the owned emulator, using the real model.
        seed = """const User=require(process.argv[1]+'/models/User');
const firebase=require(process.argv[1]+'/config/firebase');
(async()=>{const u=await User.create({email:'connected@local.test',name:'Synthetic Test',password:'synthetic-test-password-123',role:'viewer'});await User.secureUpdate(u._id,{emailVerified:true,role:'admin',siteIds:['solar_site']});await firebase.app.delete();})().catch(()=>process.exit(1));"""
        subprocess.run(['node', '-e', seed, str(ROOT / 'voltarax-web' / 'backend')],
                       cwd=log_dir, env=env, capture_output=True, check=True, timeout=60)
        readiness = wait('http://localhost:3000/api/ready', child)
        assert readiness['success'] is True
        session = urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        login = json.dumps({'email': 'connected@local.test', 'password': 'synthetic-test-password-123'}).encode()
        login_request = urllib.request.Request('http://localhost:3000/api/auth/login', data=login, method='POST',
                                               headers={'Content-Type': 'application/json', 'Origin': 'http://localhost:3000'})
        with session.open(login_request, timeout=30) as response:
            assert json.load(response)['user']['role'] == 'admin'
        with session.open('http://localhost:3000/api/auth/me', timeout=30) as response:
            assert json.load(response)['user']['role'] == 'admin'
        with session.open('http://localhost:3000/api/dashboard', timeout=30) as response:
            assert response.status == 200
        payload = json.dumps({'message': 'What is VoltVision?', 'language': 'en'}).encode()
        request = urllib.request.Request('http://localhost:3000/api/chat', data=payload, method='POST',
                                         headers={'Content-Type': 'application/json', 'Origin': 'http://localhost:3000'})
        with opener.open(request, timeout=30) as response:
            reply = json.load(response)
        assert reply['success'] is True and reply['source']['id']
        print(json.dumps({'actual_backend_server': True, 'demo_firebase_health': True,
                          'website_proxy_readiness': True, 'website_proxy_chat_source': True,
                          'synthetic_admin_login_and_dashboard': True,
                          'scope': 'Owned demo emulator, synthetic credentials; no external services'}))
    finally:
        if child.poll() is None:
            if os.name == 'nt':
                child.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                os.killpg(child.pid, signal.SIGINT)
            try:
                child.wait(timeout=20)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait(timeout=10)

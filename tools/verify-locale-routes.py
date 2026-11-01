"""Actual local Next routing smoke test. Own fake backend; no live services."""
import http.server
import json
import os
import re
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import threading
import time
import urllib.request
import urllib.error

root = Path(__file__).resolve().parents[1]
frontend = root / 'voltarax-web/frontend'
port = 38473
with socket.socket() as probe:
    probe.bind(('127.0.0.1', port))  # Refuse an occupied port; never kill its owner.


class FakeBackend(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        value = json.dumps({'synthetic': True, 'path': self.path}).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(value)))
        self.end_headers()
        self.wfile.write(value)

    def log_message(self, *_):
        pass


fake = http.server.ThreadingHTTPServer(('127.0.0.1', 0), FakeBackend)
threading.Thread(target=fake.serve_forever, daemon=True).start()
environment = {**os.environ, 'NEXT_TELEMETRY_DISABLED': '1', 'NODE_OPTIONS': '--max-old-space-size=768',
               'BACKEND_URL': f'http://127.0.0.1:{fake.server_port}'}
label = os.environ.get('LOCALE_SMOKE_LABEL', 'phase08-routing')
if not re.fullmatch('[a-z0-9-]{1,80}', label):
    raise RuntimeError('Invalid smoke-result label')
log_path = root / f'docs/test-results/{label}-dev.log'


def request(path, cookie=None):
    headers = {'Accept-Language': 'en', **({'Cookie': cookie} if cookie else {})}
    # Next development mode canonicalizes the loopback URL to localhost.
    # Use that same origin so an internal locale rewrite stays internal.
    with urllib.request.urlopen(urllib.request.Request(f'http://localhost:{port}{path}', headers=headers), timeout=75) as response:
        return response.url, response.read().decode('utf-8'), response.headers


with log_path.open('w', encoding='utf-8') as log:
    process = subprocess.Popen([shutil.which('node'), str(frontend / 'node_modules/next/dist/bin/next'), 'dev', '--hostname', 'localhost', '--port', str(port)],
                               cwd=frontend, env=environment, stdout=log, stderr=subprocess.STDOUT,
                               **({'creationflags': subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == 'nt' else {'start_new_session': True}))
    try:
        deadline = time.monotonic() + 180
        while True:
            if process.poll() is not None:
                raise RuntimeError('Local Next process exited; inspect the saved development log')
            try:
                _, english, _ = request('/')
                break
            except urllib.error.HTTPError as error:
                if error.code in (301, 302, 303, 307, 308):
                    raise RuntimeError('Local route redirected repeatedly: ' + str(error.headers.get('Location')))
                if time.monotonic() > deadline:
                    raise RuntimeError('Local Next route did not render successfully')
                time.sleep(1)
            except (OSError, urllib.error.URLError):
                if time.monotonic() > deadline:
                    raise RuntimeError('Local Next routing startup timed out')
                time.sleep(1)
        _, hindi, _ = request('/hi')
        assert '<html lang="en"' in english and '<html lang="hi"' in hindi, 'Locale document language missing'
        assert 'मुख्य पृष्ठ' in hindi and 'उत्पाद' in hindi, 'Hindi navigation not rendered'
        url, _, _ = request('/about', 'VOLTARAX_LOCALE=hi')
        assert '/hi/about' in url, 'Language preference was not preserved'
        _, health, _ = request('/health')
        _, api, _ = request('/api/local-routing-probe')
        assert json.loads(health) == {'synthetic': True, 'path': '/health'}
        assert json.loads(api) == {'synthetic': True, 'path': '/api/local-routing-probe'}
        _, _, headers = request('/hi/account/orders/synthetic-routing-probe')
        assert 'checkout.razorpay.com' in headers.get('Content-Security-Policy', ''), 'Localized payment-page CSP missing'
        result = {'english_and_hindi_document_languages': True, 'hindi_navigation': True, 'locale_preference_redirect': True,
                  'api_and_health_proxy_unprefixed': True, 'localized_checkout_header': True,
                  'backend': 'Owned loopback synthetic fixture only', 'browser_workflow': 'Not run by this HTTP smoke test'}
        (root / f'docs/test-results/{label}-fixture.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
        print(json.dumps(result))
    finally:
        fake.shutdown()
        fake.server_close()
        if process.poll() is None:
            if os.name == 'nt':
                process.terminate()  # Outer run-check Job Object closes its owned child tree.
            else:
                os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()

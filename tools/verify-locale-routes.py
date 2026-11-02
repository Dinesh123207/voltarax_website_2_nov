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
import sys
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


backend_port = 38475
fake = http.server.ThreadingHTTPServer(('127.0.0.1', backend_port), FakeBackend)
threading.Thread(target=fake.serve_forever, daemon=True).start()
environment = {**os.environ, 'NEXT_TELEMETRY_DISABLED': '1', 'NODE_OPTIONS': '--max-old-space-size=768',
               'BACKEND_URL': f'http://127.0.0.1:{fake.server_port}', 'SITE_URL': '',
               'PUBLIC_INDEXING_ENABLED': 'false', 'PUBLIC_CONTENT_REVIEWED': 'false'}
label = os.environ.get('LOCALE_SMOKE_LABEL', 'phase08-routing')
if not re.fullmatch('[a-z0-9-]{1,80}', label):
    raise RuntimeError('Invalid smoke-result label')
log_path = root / f'docs/test-results/{label}-dev.log'

if '--build' in sys.argv:
    try:
        result = subprocess.run([shutil.which('npm.cmd' if os.name == 'nt' else 'npm'), 'run', 'build'], cwd=frontend, env=environment, timeout=550)
        if result.returncode:
            raise RuntimeError('Frontend build failed')
        print(json.dumps({'built_with_owned_loopback_backend': True, 'backend_port': backend_port, 'indexing': False}))
    finally:
        fake.shutdown()
        fake.server_close()
    sys.exit(0)

production = os.environ.get('FRONTEND_CHECK_SERVER') == 'production'
if production:
    manifest = json.loads((frontend / '.next/routes-manifest.json').read_text(encoding='utf-8'))
    rewrites = manifest['rewrites']
    routes = rewrites if isinstance(rewrites, list) else sum(rewrites.values(), [])
    for route in routes:
        if route['source'] in ('/api/:path*', '/health'):
            assert route['destination'].startswith(f'http://127.0.0.1:{backend_port}/'), 'Production rewrites were not built for the owned fixture'
    assert sum(route['source'] in ('/api/:path*', '/health') for route in routes) == 2


def request(path, cookie=None, binary=False, timeout=75):
    headers = {'Accept-Language': 'en', **({'Cookie': cookie} if cookie else {})}
    # Next development mode canonicalizes the loopback URL to localhost.
    # Use that same origin so an internal locale rewrite stays internal.
    with urllib.request.urlopen(urllib.request.Request(f'http://localhost:{port}{path}', headers=headers), timeout=timeout) as response:
        body = response.read()
        return response.url, body if binary else body.decode('utf-8'), response.headers


def run_browser(layouts_only=False):
    if not production:
        # Compile selected development routes before Edge starts on the 4 GB
        # host. Production has no compiler and keeps its normal test limits.
        paths = ['/hi/privacy', '/hi/contact'] if os.environ.get('FRONTEND_CHECK_FORM_ONLY') == 'true' else ['/hi', '/hi/dashboard/users']
        for path in paths:
            request(path, timeout=180)
    browser_env = {**environment, 'E2E_BASE_URL': f'http://localhost:{port}', 'E2E_LABEL': label + '-browser', 'E2E_DEV': 'false' if production else 'true'}
    command = [shutil.which('npm.cmd' if os.name == 'nt' else 'npm'), 'run']
    grep = '@public Hindi draft' if os.environ.get('FRONTEND_CHECK_FORM_ONLY') == 'true' else '@public 360px' if os.environ.get('FRONTEND_CHECK_LANGUAGE_ONLY') == 'true' else '@public (360px|Hindi role)'
    command += ['test:e2e', '--', '--grep', grep] if layouts_only else ['test:e2e:public']
    browser = subprocess.run(command, cwd=frontend, env=browser_env, timeout=300)
    if browser.returncode:
        raise RuntimeError('Browser checks failed; inspect the saved browser result')
    stats = json.loads((root / f'docs/test-results/{label}-browser.json').read_text(encoding='utf-8'))['stats']
    assert stats['expected'] > 0 and all(stats[key] == 0 for key in ('skipped', 'unexpected', 'flaky')), 'Browser cases were skipped or did not pass cleanly'
    return stats


with log_path.open('w', encoding='utf-8') as log:
    standalone=frontend/'.next/standalone'
    if production and (standalone/'server.js').is_file():
        subprocess.run([sys.executable,str(root/'tools/prepare-standalone.py')],check=True)
        server_command=[shutil.which('node'),str(standalone/'server.js')];server_cwd=standalone
    else:
        server_command=[shutil.which('node'), str(frontend / 'node_modules/next/dist/bin/next'), 'start' if production else 'dev', '--hostname', 'localhost', '--port', str(port)];server_cwd=frontend
    process = subprocess.Popen(server_command,
                               cwd=server_cwd, env={**environment,'HOSTNAME':'localhost','PORT':str(port)}, stdout=log, stderr=subprocess.STDOUT,
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
        if os.environ.get('FRONTEND_CHECK_BROWSER_LAYOUTS_ONLY') == 'true':
            run_browser(layouts_only=True)
            result = {'browser_workflow': 'Focused 360px checks passed against owned loopback fixtures', 'full_http_smoke': 'Not run by this focused command'}
            (root / f'docs/test-results/{label}-fixture.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
            print(json.dumps(result))
            sys.exit(0)
        _, hindi, _ = request('/hi')
        _, frontend_health, frontend_health_headers = request('/healthz')
        assert json.loads(frontend_health)['app'] == 'Voltarax frontend' and 'no-store' in frontend_health_headers.get('Cache-Control','')
        try:
            request('/healthz?unexpected=1')
            raise AssertionError('Frontend health input was not validated')
        except urllib.error.HTTPError as error:
            assert error.code == 422
        assert '<html lang="en"' in english and '<html lang="hi"' in hindi, 'Locale document language missing'
        assert 'मुख्य पृष्ठ' in hindi and 'उत्पाद' in hindi, 'Hindi navigation not rendered'
        assert 'स्वच्छ ऊर्जा के लिए बुद्धिमान तकनीक।' in hindi and 'उपकरण के दर्ज व्यवहार को समझें।' in hindi, 'Hindi home headings missing'
        _, products, _ = request('/hi/products')
        _, technology, _ = request('/hi/technology')
        _, sustainability, _ = request('/hi/sustainability')
        assert 'VoltVision प्लेटफ़ॉर्म' in products and 'उपकरणों की समीक्षा के लिए सॉफ़्टवेयर' in technology
        assert 'लेप संबंधी प्रमाण की सीमाएँ' in sustainability
        assert '<title>उत्पाद | Voltarax</title>' in products and 'content="hi_IN"' in products, 'Localized metadata missing'
        assert 'name="robots" content="noindex' in products and 'rel="canonical"' not in products
        assert 'application/ld+json' not in english, 'Unreviewed project must not emit structured claims'
        _, robots, _ = request('/robots.txt')
        _, sitemap, _ = request('/sitemap.xml')
        assert robots == 'User-agent: *\nDisallow: /\n' and '<loc>' not in sitemap
        _, og, og_headers = request('/og.png', binary=True)
        assert og.startswith(b'\x89PNG\r\n\x1a\n') and int.from_bytes(og[16:20], 'big') == 1200 and int.from_bytes(og[20:24], 'big') == 630
        assert 'image/png' in og_headers.get('Content-Type', '')
        url, about, _ = request('/about', 'VOLTARAX_LOCALE=hi')
        assert '/hi/about' in url, 'Language preference was not preserved'
        assert 'Voltarax के बारे में' in about and 'बौद्धिक संपदा' in about, 'Hindi page copy was not rendered'
        _, health, _ = request('/health')
        _, api, _ = request('/api/local-routing-probe')
        assert json.loads(health) == {'synthetic': True, 'path': '/health'}
        assert json.loads(api) == {'synthetic': True, 'path': '/api/local-routing-probe'}
        _, _, headers = request('/hi/account/orders/synthetic-routing-probe')
        assert 'checkout.razorpay.com' in headers.get('Content-Security-Policy', ''), 'Localized payment-page CSP missing'
        assert 'noindex' in headers.get('X-Robots-Tag', ''), 'Account indexing header missing'
        _, privacy, privacy_headers = request('/hi/privacy')
        assert 'गोपनीयता का मसौदा' in privacy and 'सार्वजनिक उपयोग के लिए स्वीकृत नहीं' in privacy
        assert 'noindex' in privacy_headers.get('X-Robots-Tag', '')
        result = {'english_and_hindi_document_languages': True, 'hindi_navigation': True, 'hindi_about_content': True, 'hindi_home_products_technology_sustainability': True, 'locale_preference_redirect': True,
                  'api_and_health_proxy_unprefixed': True, 'localized_checkout_header': True, 'review_gated_metadata_robots_sitemap': True,
                  'localized_page_metadata': True, 'private_noindex_header': True, 'original_1200x630_png': True,
                  'hindi_legal_draft_noindex': True, 'frontend_liveness_and_validation': True,
                  'backend': 'Owned loopback synthetic fixture only', 'browser_workflow': 'Not run by this HTTP smoke test'}
        if os.environ.get('FRONTEND_CHECK_BROWSER') == 'true':
            result['browser_stats'] = run_browser()
            result['browser_workflow'] = 'Local synthetic UI checks passed; no real services or backend authentication verification'
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

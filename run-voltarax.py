"""Run a local synthetic demo or a separately configured test installation."""
import argparse
import http.cookiejar
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parent
FRONT = ROOT / 'voltarax-web' / 'frontend'
BACK = ROOT / 'voltarax-web' / 'backend'
NEXT = FRONT / 'node_modules' / 'next' / 'dist' / 'bin' / 'next'
FIREBASE_CLI = BACK / 'node_modules' / 'firebase-tools' / 'lib' / 'bin' / 'firebase.js'
JAR = Path.home() / '.cache' / 'firebase' / 'emulators' / 'firebase-database-emulator-v4.11.2.jar'
BASE = 'http://localhost:3000'


def windows_job():
    """Keep only the launched processes and their descendants in an owned job."""
    import ctypes
    from ctypes import wintypes as w
    class Basic(ctypes.Structure):
        _fields_ = [('process_time', ctypes.c_int64), ('job_time', ctypes.c_int64), ('flags', w.DWORD),
                    ('min_working', ctypes.c_size_t), ('max_working', ctypes.c_size_t), ('active', w.DWORD),
                    ('affinity', ctypes.c_size_t), ('priority', w.DWORD), ('scheduling', w.DWORD)]
    class Io(ctypes.Structure):
        _fields_ = [(name, ctypes.c_uint64) for name in ('read_ops', 'write_ops', 'other_ops', 'read_bytes', 'write_bytes', 'other_bytes')]
    class Extended(ctypes.Structure):
        _fields_ = [('basic', Basic), ('io', Io), ('process_memory', ctypes.c_size_t), ('job_memory', ctypes.c_size_t),
                    ('peak_process', ctypes.c_size_t), ('peak_job', ctypes.c_size_t)]
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    kernel.CreateJobObjectW.argtypes = [ctypes.c_void_p, w.LPCWSTR]
    kernel.CreateJobObjectW.restype = w.HANDLE
    kernel.SetInformationJobObject.argtypes = [w.HANDLE, ctypes.c_int, ctypes.c_void_p, w.DWORD]
    kernel.AssignProcessToJobObject.argtypes = [w.HANDLE, w.HANDLE]
    kernel.CloseHandle.argtypes = [w.HANDLE]
    handle = kernel.CreateJobObjectW(None, None)
    if not handle:
        raise ctypes.WinError(ctypes.get_last_error())
    info = Extended()
    info.basic.flags = 0x2000  # Kill only this job's processes when the handle closes.
    if not kernel.SetInformationJobObject(handle, 9, ctypes.byref(info), ctypes.sizeof(info)):
        kernel.CloseHandle(handle)
        raise ctypes.WinError(ctypes.get_last_error())
    return kernel, handle


def require_runtime():
    node = shutil.which('node')
    if not node:
        raise RuntimeError('Install Node.js 24.19 or newer in the 24.x series, then retry.')
    version = subprocess.check_output([node, '--version'], text=True, timeout=10).strip().lstrip('v')
    numbers = tuple(int(part) for part in version.split('.')[:3])
    if not (numbers >= (24, 19, 0) and numbers < (25, 0, 0)):
        raise RuntimeError('This project requires Node.js >=24.19.0 and <25.')
    return node


def setup(node):
    npm = shutil.which('npm.cmd' if os.name == 'nt' else 'npm')
    if not npm:
        raise RuntimeError('npm is required to install the locked project dependencies.')
    for directory, marker in ((FRONT, NEXT), (BACK, FIREBASE_CLI)):
        if not marker.is_file():
            print('Installing locked dependencies for', directory.name, flush=True)
            subprocess.run([npm, 'ci'], cwd=directory, check=True, timeout=600)
    if not JAR.is_file():
        print('Downloading the official Firebase database emulator.', flush=True)
        subprocess.run([node, str(FIREBASE_CLI), 'setup:emulators:database'], cwd=BACK, check=True, timeout=600)
    print('Setup complete. Run: python run-voltarax.py', flush=True)


def check_port(port):
    with socket.socket() as probe:
        try:
            probe.bind(('127.0.0.1', port))
        except OSError as error:
            raise RuntimeError(f'Port {port} is already in use. Stop the existing service yourself and retry.') from error


def wait_for(url, processes, timeout, headers=None):
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if any(process.poll() is not None for process in processes):
            raise RuntimeError('A service stopped during startup. See the local logs shown below.')
        try:
            with opener.open(urllib.request.Request(url, headers=headers or {}), timeout=3) as response:
                if response.status == 200:
                    return
        except (OSError, urllib.error.URLError):
            time.sleep(.4)
    raise RuntimeError('A service did not become ready. See the local logs shown below.')


def demo_environment():
    # Do not inherit real Firebase, mail, payment or database credentials.
    keep = {'PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP',
            'USERPROFILE', 'HOME', 'HOMEDRIVE', 'HOMEPATH', 'LOCALAPPDATA',
            'APPDATA', 'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMDATA', 'LANG'}
    return {key: value for key, value in os.environ.items() if key.upper() in keep}


def login_smoke():
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    payload = json.dumps({'email': 'admin@local.test', 'password': 'synthetic-local-password-123'}).encode()
    rejected = urllib.request.Request(BASE + '/api/auth/login', data=payload,
                                      headers={'Content-Type': 'application/json', 'Origin': 'http://localhost:3999'}, method='POST')
    try:
        opener.open(rejected, timeout=30).close()
    except urllib.error.HTTPError as error:
        if error.code != 403:
            raise
    else:
        raise RuntimeError('The demo API accepted an unexpected browser origin.')
    request = urllib.request.Request(BASE + '/api/auth/login', data=payload,
                                     headers={'Content-Type': 'application/json', 'Origin': BASE}, method='POST')
    with opener.open(request, timeout=30) as response:
        data = json.load(response)
    if not data.get('success') or data.get('user', {}).get('role') != 'admin':
        raise RuntimeError('Synthetic administrator login did not succeed.')
    with opener.open(BASE + '/api/auth/me', timeout=30) as response:
        if json.load(response).get('user', {}).get('role') != 'admin':
            raise RuntimeError('Synthetic session was not retained through the frontend proxy.')


def run(args, node):
    if not NEXT.is_file() or not (BACK / 'node_modules' / 'firebase-admin').is_dir() or (not args.connected and not FIREBASE_CLI.is_file()):
        raise RuntimeError('Project dependencies are missing. Run: python run-voltarax.py --setup')
    demo = not args.connected
    if args.check and not demo:
        raise RuntimeError('--check is available only for the isolated demo.')
    if demo:
        if not JAR.is_file() or not shutil.which('java'):
            raise RuntimeError('Demo requires Java and the database emulator. Install Java, then run: python run-voltarax.py --setup')
        ports = (3000, 38475, 9000)
        env = demo_environment()
        env.update(FIREBASE_DATABASE_EMULATOR_HOST='127.0.0.1:9000', FIREBASE_PROJECT_ID='demo-voltarax',
                   GCLOUD_PROJECT='demo-voltarax', E2E_FIXTURE_TOKEN=secrets.token_hex(32),
                   E2E_FRONTEND_PORT='3000', NODE_ENV='test')
        backend_port = 38475
    else:
        owned_demo = (os.environ.get('FIREBASE_DATABASE_EMULATOR_HOST') == '127.0.0.1:9000'
                      and os.environ.get('FIREBASE_PROJECT_ID') == 'demo-voltarax')
        if not (BACK / '.env').is_file() and not owned_demo:
            raise RuntimeError('Connected test mode needs an existing backend/.env. Follow docs/VERIFICATION_AND_RUN_GUIDE.md first.')
        ports = (3000, 5000)
        env = os.environ.copy()
        env.update(NODE_ENV='development', PORT='5000', VOLTARAX_BIND_HOST='127.0.0.1',
                   FRONTEND_URL=BASE, CORS_ORIGINS=BASE, TRUST_PROXY_HOPS='0',
                   EMAIL_ENABLED='false', NOTIFICATIONS_ENABLED='false', PAYMENTS_ENABLED='false',
                   RELAY_CONTROL_ENABLED='false', CAMERA_ENABLED='false', BOOTSTRAP_ADMIN_ENABLED='false',
                   AI_REMOTE_ACCESS_ENABLED='false', AI_PUBLISH_ENABLED='false')
        backend_port = 5000
    for port in ports:
        check_port(port)
    env.update(NEXT_TELEMETRY_DISABLED='1', BACKEND_URL=f'http://127.0.0.1:{backend_port}',
               PUBLIC_INDEXING_ENABLED='false', PUBLIC_CONTENT_REVIEWED='false',
               NODE_OPTIONS='--max-old-space-size=768')
    for key in ('JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS'):
        env.pop(key, None)
    log_root = ROOT / '.local-tools' / 'launcher'
    log_root.mkdir(parents=True, exist_ok=True)
    log_dir = Path(tempfile.mkdtemp(prefix='run-', dir=log_root))
    processes, files = [], []
    job = windows_job() if os.name == 'nt' else None
    def start(name, command, cwd, child_env):
        log = (log_dir / (name + '.log')).open('w', encoding='utf-8')
        files.append(log)
        process = subprocess.Popen(command, cwd=cwd, env=child_env, stdout=log, stderr=subprocess.STDOUT,
                                   creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0,
                                   start_new_session=os.name != 'nt')
        processes.append(process)
        if job and not job[0].AssignProcessToJobObject(job[1], int(process._handle)):
            raise RuntimeError('Unable to contain the service process tree safely.')
        return process
    try:
        if demo:
            print('Starting isolated demo database...', flush=True)
            start('database', [shutil.which('java'), '-Xms32m', '-Xmx256m', '-XX:ActiveProcessorCount=2', '-jar', str(JAR), '--host', '127.0.0.1', '--port', '9000'], ROOT, env)
            wait_for('http://127.0.0.1:9000/.json?ns=demo-voltarax', processes, 90)
            print('Starting demo API...', flush=True)
            start('api', [node, str(BACK / 'tests' / 'fixtures' / 'e2e-server.cjs')], BACK, env)
            wait_for('http://127.0.0.1:38475/api/__fixture/status', processes, 120, {'x-e2e-fixture': env['E2E_FIXTURE_TOKEN']})
        else:
            print('Starting configured test API...', flush=True)
            start('api', [node, str(BACK / 'server.js')], BACK, env)
            wait_for('http://127.0.0.1:5000/health', processes, 120)
        print('Starting website (first startup may take a little time)...', flush=True)
        web_env = env.copy()
        web_env['NODE_ENV'] = 'development'
        start('website', [node, str(NEXT), 'dev', '--hostname', 'localhost', '--port', '3000'], FRONT, web_env)
        wait_for(BASE + '/login', processes, 180)
        if demo:
            login_smoke()
            print('\nDEMO ONLY: temporary synthetic data; it is lost when the launcher stops.', flush=True)
            print('Demo administrator: admin@local.test', flush=True)
            print('Demo password: synthetic-local-password-123', flush=True)
            print('Email delivery, real payments, hardware and field AI are not connected.', flush=True)
        else:
            print('\nConfigured test API started. Real data may be read or updated by the application.', flush=True)
            print('Email, payments, relay and camera are disabled by this launcher.', flush=True)
        print('Open:', BASE, '| Hindi:', BASE + '/hi', flush=True)
        if args.check:
            print('Demo startup and proxy/login check passed.', flush=True)
            return
        if not args.no_browser:
            webbrowser.open(BASE)
        print('Keep this window open. Press Ctrl+C to stop the services started here.', flush=True)
        while all(process.poll() is None for process in processes):
            time.sleep(1)
        raise RuntimeError('A service stopped unexpectedly. See the local logs shown below.')
    finally:
        for process in reversed(processes):
            if process.poll() is None:
                if os.name == 'nt':
                    process.terminate()
                else:
                    os.killpg(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=8)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)
        if job:
            job[0].CloseHandle(job[1])
        for file in files:
            file.close()
        print('Local logs:', log_dir, flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--setup', action='store_true', help='Install missing locked dependencies and the demo emulator')
    parser.add_argument('--connected', action='store_true', help='Start the API using an already configured test project')
    parser.add_argument('--no-browser', action='store_true', help='Do not open a browser automatically')
    parser.add_argument('--check', action='store_true', help='Start and verify the isolated demo, then stop it')
    args = parser.parse_args()
    try:
        node = require_runtime()
        if args.setup:
            if args.connected or args.check:
                parser.error('--setup cannot be combined with --connected or --check')
            setup(node)
        else:
            run(args, node)
    except KeyboardInterrupt:
        print('\nStopped.', flush=True)
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
        print('Unable to start Voltarax:', error, file=sys.stderr, flush=True)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())

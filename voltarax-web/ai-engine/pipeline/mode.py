"""No implicit remote Firebase access; isolated demo mode ignores real keys."""
import os
import re
import config as cfg


def demo_emulator():
    host = os.environ.get('FIREBASE_DATABASE_EMULATOR_HOST')
    if not host:
        return False
    project = os.environ.get('FIREBASE_PROJECT_ID', '')
    if not re.fullmatch(r'127\.0\.0\.1:[0-9]{1,5}', host) or not 1 <= int(host.split(':')[1]) <= 65535 or not project.startswith('demo-') or os.environ.get('NODE_ENV') == 'production':
        raise RuntimeError('Only a loopback non-production demo project may use the emulator')
    if not re.fullmatch(r'demo-[a-z0-9-]{1,50}', project):
        raise RuntimeError('Invalid demo project identifier')
    return True


def require_remote_access():
    if not demo_emulator() and not cfg.REMOTE_ACCESS_ENABLED:
        raise RuntimeError('Remote AI Firebase access is disabled; use offline evaluation or the local demo emulator')

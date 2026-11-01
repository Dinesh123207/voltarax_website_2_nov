"""Run a local check with a ten-minute ceiling and retain its actual output."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time


def windows_job():
    """Contain only this command's descendants, including emulator JVMs."""
    import ctypes
    from ctypes import wintypes as w
    class Basic(ctypes.Structure):
        _fields_ = [('process_time', ctypes.c_int64), ('job_time', ctypes.c_int64), ('flags', w.DWORD),
                    ('min_working', ctypes.c_size_t), ('max_working', ctypes.c_size_t), ('active', w.DWORD),
                    ('affinity', ctypes.c_size_t), ('priority', w.DWORD), ('scheduling', w.DWORD)]
    class Io(ctypes.Structure):
        _fields_ = [(name, ctypes.c_uint64) for name in ('read_ops', 'write_ops', 'other_ops', 'read_bytes', 'write_bytes', 'other_bytes')]
    class Extended(ctypes.Structure):
        _fields_ = [('basic', Basic), ('io', Io), ('process_memory', ctypes.c_size_t), ('job_memory', ctypes.c_size_t), ('peak_process', ctypes.c_size_t), ('peak_job', ctypes.c_size_t)]
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    kernel.CreateJobObjectW.argtypes = [ctypes.c_void_p, w.LPCWSTR]
    kernel.CreateJobObjectW.restype = w.HANDLE
    kernel.SetInformationJobObject.argtypes = [w.HANDLE, ctypes.c_int, ctypes.c_void_p, w.DWORD]
    kernel.AssignProcessToJobObject.argtypes = [w.HANDLE, w.HANDLE]
    kernel.CloseHandle.argtypes = [w.HANDLE]
    handle = kernel.CreateJobObjectW(None, None)
    if not handle: raise ctypes.WinError(ctypes.get_last_error())
    info = Extended(); info.basic.flags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    if not kernel.SetInformationJobObject(handle, 9, ctypes.byref(info), ctypes.sizeof(info)):
        kernel.CloseHandle(handle); raise ctypes.WinError(ctypes.get_last_error())
    return kernel, handle

p = argparse.ArgumentParser()
p.add_argument('--cwd', required=True)
p.add_argument('--name', required=True)
p.add_argument('command', nargs=argparse.REMAINDER)
a = p.parse_args()
command = a.command[1:] if a.command[:1] == ['--'] else a.command
if os.name == 'nt' and command[0] in ('npm', 'npx'):
    command[0] += '.cmd'
root = Path(__file__).resolve().parent.parent
out = root / 'docs' / 'test-results'
out.mkdir(parents=True, exist_ok=True)
started = time.time()
with (out / f'{a.name}.log').open('w', encoding='utf-8') as log:
    job = None
    try:
        if os.name == 'nt': job = windows_job()
        process = subprocess.Popen(command, cwd=a.cwd, stdout=log, stderr=subprocess.STDOUT, start_new_session=os.name != 'nt')
        if job and not job[0].AssignProcessToJobObject(job[1], int(process._handle)):
            process.kill(); process.wait(); raise OSError('Unable to contain check process tree')
        code = process.wait(timeout=600)
    except subprocess.TimeoutExpired:
        if os.name == 'nt':
            subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], stdout=log, stderr=subprocess.STDOUT)
        else:
            import signal
            os.killpg(process.pid, signal.SIGKILL)
        process.wait()
        log.write('\nTIMEOUT after 600 seconds\n')
        code = 124
    except OSError:
        log.write('\nCheck could not start or contain its process tree\n'); code = 125
    finally:
        if job: job[0].CloseHandle(job[1])
report = {'command': command, 'cwd': a.cwd, 'exit_code': code, 'seconds': round(time.time() - started, 2)}
(out / f'{a.name}.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
sys.exit(code)

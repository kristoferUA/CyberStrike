"""Linux backend for bounded local CTF tooling, shared by CyberStrike and Codex CLI."""
import hashlib
import importlib.metadata
import json
import os
import pathlib
import re
import shutil
import signal
import socket
import struct
import subprocess
import sys
import tempfile
import time
import uuid

ROOT = pathlib.Path(__file__).resolve().parent
HOME = pathlib.Path(os.environ.get('XDG_DATA_HOME', str(pathlib.Path.home() / '.local/share'))) / 'cyberstrike/pwn'
PYTHON = HOME / 'venv/bin/python'
ENV = {**os.environ, 'PWNLIB_NOTERM': '1', 'PWNLIB_UPDATE_CHECK_INTERVAL': 'never', 'PYTHONUNBUFFERED': '1', 'PYTHONDONTWRITEBYTECODE': '1'}
ARCH = {'amd64': 'x86_64', 'i386': 'i386', 'aarch64': 'aarch64', 'arm': 'arm', 'mips': 'mips', 'mipsel': 'mipsel', 'riscv64': 'riscv64', 'ppc': 'ppc'}
MACHINES = {3: 'i386', 62: 'amd64', 183: 'aarch64', 40: 'arm', 243: 'riscv64', 20: 'ppc'}

def text(file, limit=131072):
    with open(file, 'rb') as stream:
        data = stream.read(limit + 1)
    return data[:limit].decode('utf-8', errors='replace') + ('\n[output truncated]' if len(data) > limit else '')

def kill(proc):
    if proc is not None and proc.poll() is None:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        proc.wait()

def command(argv, timeout=30, cwd=None, stdin=None):
    with tempfile.TemporaryFile() as out, tempfile.TemporaryFile() as err:
        proc = subprocess.Popen(argv, cwd=cwd, env=ENV, stdin=subprocess.PIPE if stdin is not None else subprocess.DEVNULL,
                                stdout=out, stderr=err, start_new_session=True)
        expired = False
        try:
            proc.communicate(None if stdin is None else stdin if isinstance(stdin, bytes) else stdin.encode('utf-8'), timeout=timeout)
        except subprocess.TimeoutExpired:
            expired = True
        finally:
            kill(proc)
        out.seek(0); err.seek(0)
        return {'exitCode': proc.returncode, 'timedOut': expired,
                'stdout': out.read(131072).decode('utf-8', errors='replace'),
                'stderr': err.read(131072).decode('utf-8', errors='replace')}

def architecture(file):
    with open(file, 'rb') as stream:
        header = stream.read(20)
    if len(header) < 20 or header[:4] != b'\x7fELF':
        raise ValueError('QEMU user mode requires an ELF executable; use a matching VM/debugger for PE or kernel images.')
    machine = struct.unpack('<H' if header[5] == 1 else '>H', header[18:20])[0]
    if machine == 8:
        return 'mipsel' if header[5] == 1 else 'mips'
    if machine not in MACHINES:
        raise ValueError('Unsupported ELF machine; select a supported architecture explicitly.')
    return MACHINES[machine]

def qemu(request):
    arch = request.get('arch') or architecture(request['file'])
    if arch not in ARCH:
        raise ValueError('Unsupported QEMU architecture.')
    executable = shutil.which('qemu-' + ARCH[arch])
    if not executable:
        raise ValueError('Missing qemu-' + ARCH[arch] + '; run cyberstrike pwn setup.')
    args = [executable]
    root = request.get('sysroot')
    if root:
        if not pathlib.Path(root).is_dir():
            raise ValueError('The supplied sysroot directory does not exist.')
        args += ['-L', root]
    return args

def debug(request):
    argv = qemu(request)
    timeout = request.get('timeout', 30)
    version = command([argv[0], '--version'], 5)['stdout']
    major = int(re.search(r'version (\d+)', version).group(1))
    # Older qemu-user only offers a TCP port, which otherwise binds all interfaces.
    # Keep its stub in a private network namespace; never expose an external debug port.
    if major < 10 and not request.get('_namespace'):
        copy = {**request, '_namespace': True}
        result = command(['unshare', '-Urn', '--', sys.executable, str(ROOT / 'backend.py'), json.dumps(copy)], timeout + 10)
        if result['exitCode'] == 0:
            return json.loads(result['stdout'])
        raise ValueError('Private QEMU namespace failed: ' + result['stderr'])
    if request.get('_namespace'):
        raised = command(['ip', 'link', 'set', 'lo', 'up'], 5)
        if raised['exitCode'] != 0:
            raise ValueError('Private network namespaces are unavailable. Use QEMU >= 10 with a Unix gdb socket.')
    logs = pathlib.Path(request['cwd']) / ('pwn-debug-' + uuid.uuid4().hex[:12])
    logs.mkdir()
    proc = None
    with tempfile.TemporaryDirectory(prefix='cs-pwn-') as temp:
        endpoint = str(pathlib.Path(temp) / 'gdb.sock')
        if major < 10:
            with socket.socket() as sock:
                sock.bind(('127.0.0.1', 0)); endpoint = str(sock.getsockname()[1])
        def quote(value):
            return '"' + value.replace('\\', '\\\\').replace('"', '\\"') + '"'
        target = '127.0.0.1:' + endpoint if major < 10 else endpoint
        commands = ['set pagination off', 'set confirm off', 'set debuginfod enabled off',
                    'set auto-load safe-path /nonexistent', 'file ' + quote(request['file'])]
        if request.get('sysroot'):
            commands += ['set sysroot ' + quote(request['sysroot'])]
        commands += ['set remotetimeout 5', 'target remote ' + target]
        commands += pathlib.Path(request['gdb_script']).read_text(encoding='utf-8-sig').splitlines() if request.get('gdb_script') else ['info registers', 'x/12i $pc', 'bt']
        commands += ['detach', 'quit']
        script = pathlib.Path(temp) / 'commands.gdb'
        script.write_text('\n'.join(commands) + '\n', encoding='utf-8')
        (logs / 'commands.gdb').write_text(script.read_text(), encoding='utf-8')
        started = time.monotonic()
        with open(logs / 'qemu.stdout.txt', 'wb') as out, open(logs / 'qemu.stderr.txt', 'wb') as err, open(request.get('stdin_file', os.devnull), 'rb') as input:
            try:
                proc = subprocess.Popen(argv + ['-g', endpoint, request['file']] + request.get('args', []),
                                        cwd=request['cwd'], env=ENV, stdin=input,
                                        stdout=out, stderr=err, start_new_session=True)
                if major >= 10:
                    while not pathlib.Path(endpoint).exists():
                        if proc.poll() is not None:
                            raise ValueError('QEMU exited before debugger startup: ' + text(logs / 'qemu.stderr.txt'))
                        if time.monotonic() - started > min(5, timeout):
                            raise ValueError('QEMU debugger readiness timed out.')
                        time.sleep(0.025)
                else:
                    time.sleep(0.2)
                result = command(['gdb-multiarch', '-q', '-nx', '-batch', '-x', str(script)],
                                 max(1, timeout - (time.monotonic() - started)), request['cwd'])
                (logs / 'gdb.stdout.txt').write_text(result['stdout'], encoding='utf-8')
                (logs / 'gdb.stderr.txt').write_text(result['stderr'], encoding='utf-8')
                return {**result, 'qemuStdout': text(logs / 'qemu.stdout.txt'),
                        'qemuStderr': text(logs / 'qemu.stderr.txt'), 'artifacts': str(logs),
                        'transport': 'private-network-namespace' if major < 10 else 'private-unix-socket'}
            finally:
                kill(proc)

def status():
    tools = {name: shutil.which(name) for name in ['gdb', 'gdb-multiarch', 'file', 'readelf', 'objdump', 'strace', 'ltrace', 'patchelf', 'qemu-system-x86_64'] + ['qemu-' + a for a in ARCH.values()]}
    packages = {}
    if PYTHON.exists():
        result = command([str(PYTHON), '-c', "import importlib.metadata,json; print(json.dumps({n:importlib.metadata.version(n) for n in ['pwntools','ROPgadget','ropper','capstone','unicorn','pyelftools','keystone-engine']}))"], 15)
        if result['exitCode'] == 0:
            packages = json.loads(result['stdout'])
    lock = ROOT / 'requirements.lock'
    return {'environment': str(PYTHON.parent.parent), 'python': str(PYTHON), 'packages': packages,
            'tools': tools, 'ready': bool(packages) and all(tools[n] for n in ['gdb-multiarch', 'qemu-aarch64', 'qemu-x86_64', 'readelf']),
            'lockMatches': lock.exists() and (HOME / 'lock.sha256').exists() and hashlib.sha256(lock.read_bytes()).hexdigest() == (HOME / 'lock.sha256').read_text().strip()}

def main(request):
    action = request['command']
    if action == 'status':
        return status()
    if action == 'debug':
        return debug(request)
    args = request.get('args', [])
    if action == 'python':
        argv = [str(PYTHON), request['file']] + args
    elif action == 'inspect':
        argv = [str(PYTHON), str(ROOT / 'elf_info.py'), request['file']]
    elif action == 'qemu':
        argv = qemu(request) + [request['file']] + args
    elif action == 'binary':
        argv = [request['file']] + args
    elif action == 'gdb':
        if not request.get('gdb_script'):
            raise ValueError('Batch GDB requires a reviewed gdb_script file.')
        argv = ['gdb-multiarch', '-q', '-nx', '-batch', '-iex', 'set auto-load safe-path /nonexistent', '-iex', 'set debuginfod enabled off', '-x', request['gdb_script'], request['file']] + args
    elif action in ['ROPgadget', 'ropper']:
        argv = [str(PYTHON.parent / action)] + args + (['--binary' if action == 'ROPgadget' else '--file', request['file']] if request.get('file') else [])
    elif action in ['checksec', 'cyclic']:
        argv = [str(PYTHON.parent / 'pwn'), action] + args + ([request['file']] if request.get('file') else [])
    elif action in ['file', 'readelf', 'objdump', 'nm', 'strings', 'strace', 'ltrace', 'patchelf']:
        argv = [action] + args + ([request['file']] if request.get('file') else [])
    else:
        raise ValueError('Unsupported pwn command.')
    data = pathlib.Path(request['stdin_file']).read_bytes() if request.get('stdin_file') else request.get('stdin')
    return command(argv, request.get('timeout', 30), request['cwd'], data)

if __name__ == '__main__':
    try:
        request = json.loads(sys.argv[1])
        if not 1 <= request.get('timeout', 30) <= 300:
            raise ValueError('Timeout must be between 1 and 300 seconds.')
        print(json.dumps(main(request), indent=2))
    except Exception as exc:
        print(json.dumps({'error': str(exc), 'exitCode': 1}), file=sys.stderr)
        sys.exit(1)

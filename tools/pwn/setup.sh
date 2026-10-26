#!/bin/sh
set -eu
if [ "$(id -u)" -eq 0 ]; then
    echo 'Create the Python environment as your normal Ubuntu user, not root. Initialize Ubuntu first.' >&2
    exit 1
fi
resources=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
pwn_home="${XDG_DATA_HOME:-$HOME/.local/share}/cyberstrike/pwn"
mkdir -p "$pwn_home"
python3 -m venv "$pwn_home/bootstrap"
"$pwn_home/bootstrap/bin/python" -m pip install --disable-pip-version-check --require-hashes -r "$resources/bootstrap.lock"
export UV_PYTHON_INSTALL_DIR="$pwn_home/python"
if [ ! -x "$pwn_home/venv/bin/python" ]; then
    "$pwn_home/bootstrap/bin/uv" venv --managed-python --python 3.12 "$pwn_home/venv"
fi
"$pwn_home/bootstrap/bin/uv" pip sync --python "$pwn_home/venv/bin/python" --require-hashes "$resources/requirements.lock"
sha256sum "$resources/requirements.lock" | cut -d ' ' -f 1 > "$pwn_home/lock.sha256"
echo "Pwn Python environment: $pwn_home/venv"

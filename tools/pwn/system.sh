#!/bin/sh
set -eu
if [ "$(id -u)" -ne 0 ]; then
    echo 'Run this dependency step as root (the Windows installer uses wsl --user root).' >&2
    exit 1
fi
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
    ca-certificates python3 python3-venv build-essential pkg-config libssl-dev libffi-dev \
    file binutils binutils-multiarch gdb gdb-multiarch strace ltrace patchelf \
    qemu-user qemu-system-x86 iproute2 util-linux \
    gcc-aarch64-linux-gnu libc6-arm64-cross libc6-dev-arm64-cross libc6-armhf-cross

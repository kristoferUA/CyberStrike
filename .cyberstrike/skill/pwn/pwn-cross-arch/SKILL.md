---
name: pwn-cross-arch
description: "Use QEMU user-mode and GDB-multiarch for scoped non-native ELF CTF debugging with matching sysroots."
version: "1.0.0"
author: "ljagiello/ctf-skills; CyberStrike CTF adapters"
category: pwn
tags: [ctf, pwn]
tech_stack: [Python, WSL2, QEMU, GDB]
---

# Cross-architecture debugging
Read overflow-basics/advanced-exploits-4 and inspect ELF machine, bits and endian first. Use pwn_debug for a bounded QEMU+gdb-multiarch session. It owns and cleans its QEMU child; modern QEMU uses a private Unix gdb socket. Older QEMU uses a private network namespace or reports an unsupported backend instead of exposing the stub.
Use --arch amd64/i386/aarch64/arm/mips/mipsel/riscv64/ppc when auto-detection is insufficient. Pass a matching --sysroot for dynamically linked foreign binaries, e.g. /usr/aarch64-linux-gnu; preserve supplied libc and loader. A missing ELF interpreter is an environment error, not proof that the target is broken. ARM Thumb state, delay slots, ABI argument registers, stack alignment and instruction endianness matter.
The default debug action only inspects entry registers/instructions. Supply a reviewed GDB command file to set breakpoints/continue; save logs and a binary stdin file when needed. QEMU user-mode does not boot kernels, emulate privileged hardware or provide a matching remote kernel. Use a supplied VM image and qemu-system for a kernel task, not the host kernel.

## Provenance

Adapted from MIT-licensed ljagiello/ctf-skills, commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Pinned general chapters, LICENSE and SOURCE.json are in the ctf-pwn skill. Per-challenge pwnable walkthroughs and upstream installer scripts are not bundled.

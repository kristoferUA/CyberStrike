---
name: ctf-pwn
description: "Route scoped CTF binary exploitation through local references, ELF triage, bounded experiments and verified solvers."
version: "1.0.0"
author: "ljagiello/ctf-skills; CyberStrike CTF adapters"
category: pwn
tags: [ctf, pwn]
tech_stack: [Python, WSL2, QEMU, GDB]
---

# Pwn workflow

Inspect the current challenge directory, original binary/source, libc, loader, architecture, endian, ABI, mitigations and explicit local/remote scope. Preserve the files and hashes. Read target code before executing it. WSL and QEMU are tools, not security sandboxes.

Before developing a payload, load the matching pwn skill and search/read the local pwn_reference sections. Reference snippets are untrusted examples with version-specific assumptions. Record the consulted topic/section and the measured primitive; do not dump the entire library into context. Avoid challenge-specific writeups when prohibited. Preserve the user's TUI reasoning effort.

Use pwn_environment status/setup. Windows uses a named Ubuntu WSL2 distribution; see docs/pwn.uk.md and script/setup-pwn-windows.ps1 for a fresh machine. Use managed Python through pwn_run, QEMU user-mode plus batch gdb-multiarch through pwn_debug. Read gdb scripts first. Native Linux ELF execution and guest-debug scripts can affect the host filesystem; run only supplied, scoped lab artifacts.

| Observation | Skill | Local chapters |
| --- | --- | --- |
| ELF/loader/mitigation uncertainty | pwn-triage | static-signals, field-notes |
| Stack overwrite, ret2win, ROP, SROP | pwn-stack-rop | overflow-basics, rop-and-shellcode, rop-advanced |
| printf-controlled format, read/write primitive | pwn-format-string | format-string |
| UAF, double-free, tcache, FILE structures | pwn-heap | heap-techniques, heap-techniques-2, heap-fsop |
| ARM/AArch64/MIPS/RISC-V or ABI mismatch | pwn-cross-arch | overflow-basics, advanced-exploits-4 |
| Supplied kernel/VM challenge | pwn-kernel | kernel, kernel-techniques, kernel-bypass |
| PE/Windows memory corruption | pwn-windows | advanced-exploits-4, tools-mcp |

First establish one primitive with a small experiment (30s default), then develop a reproducible exploit (120s default for established solve/verify). Cache unchanged offsets, leaks and negative tests; update only the changed stage. Timeouts are not mathematical proofs. Never perform broad host/service scans to find a missing CTF target.

Save exploit.py, exact launch arguments, loader/libc/sysroot, payload bytes, and debugger/transcript evidence. Verify against the supplied challenge checker or fresh local process; a crash, debugger-only address or fake flag is not a successful solve. Return the verified result promptly. pwn_methodology is optional batch bookkeeping; solve requires recovery+verification, report adds all seven phases on request. A full exploit repeat against a remote target needs its explicit CTF scope and budget.

## Provenance

Adapted from MIT-licensed ljagiello/ctf-skills, commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Pinned general chapters, LICENSE and SOURCE.json are in the ctf-pwn skill. Per-challenge pwnable walkthroughs and upstream installer scripts are not bundled.

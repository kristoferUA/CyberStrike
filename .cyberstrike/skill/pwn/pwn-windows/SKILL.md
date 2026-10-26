---
name: pwn-windows
description: "Route scoped PE/Windows CTF binaries to version-matched native debugging rather than Linux QEMU-user."
version: "1.0.0"
author: "ljagiello/ctf-skills; CyberStrike CTF adapters"
category: pwn
tags: [ctf, pwn]
tech_stack: [Python, WSL2, QEMU, GDB]
---

# Windows binary CTF
Read advanced-exploits-4 and tools-mcp. Identify PE bitness, calling convention, DEP, ASLR, CFG, SEH/SafeSEH and the exact Windows/runtime build. QEMU Linux user-mode cannot execute PE binaries. Use a dedicated Windows lab/VM and installed WinDbg/x64dbg (or an authorized existing debugger integration); this profile does not silently install commercial tooling or run a Windows target in Linux.
Establish the memory corruption primitive with a controlled input and debugger evidence. Keep all work inside the provided CTF lab. Distinguish analysis/tooling availability from a verified exploit; save the exact local commands and evidence.

## Provenance

Adapted from MIT-licensed ljagiello/ctf-skills, commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Pinned general chapters, LICENSE and SOURCE.json are in the ctf-pwn skill. Per-challenge pwnable walkthroughs and upstream installer scripts are not bundled.

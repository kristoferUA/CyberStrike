---
name: pwn-triage
description: "Identify CTF ELF architecture, loader, mitigations and input surface before binary exploitation."
version: "1.0.0"
author: "ljagiello/ctf-skills; CyberStrike CTF adapters"
category: pwn
tags: [ctf, pwn]
tech_stack: [Python, WSL2, QEMU, GDB]
---

# ELF triage
Read static-signals and the relevant field-notes section. Use pwn_run inspect/file/readelf, never ldd on untrusted binaries. Record architecture, bits, endian, PIE, NX, canary, RELRO, symbol stripping, interpreter and build IDs. Match supplied libc/ld, not a host version guessed from an address.
Find the vulnerable input path and prove length, sign, lifetime or format assumptions. Disassemble only relevant functions. If understanding the binary is the main blocker, reverse it first. Capture a minimal reproducible crash and fault context before guessing chains; keep offsets tied to exact input bytes and architecture.

## Provenance

Adapted from MIT-licensed ljagiello/ctf-skills, commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Pinned general chapters, LICENSE and SOURCE.json are in the ctf-pwn skill. Per-challenge pwnable walkthroughs and upstream installer scripts are not bundled.

---
name: pwn-stack-rop
description: "Develop and verify scoped stack-overflow, ret2win, ret2libc, ROP and SROP CTF primitives."
version: "1.0.0"
author: "ljagiello/ctf-skills; CyberStrike CTF adapters"
category: pwn
tags: [ctf, pwn]
tech_stack: [Python, WSL2, QEMU, GDB]
---

# Stack and ROP
Read overflow-basics, then rop-and-shellcode or rop-advanced for the observed primitive. Establish the actual overwrite offset with an architecture-correct cyclic pattern and the observed register/stack bytes. Preserve canary, saved registers, stack alignment and input terminators; reason about PIE and libc bases from measured leaks.
Validate gadgets and function addresses against the exact ELF/libc and runtime ABI. A ret2libc plan needs a valid leak and matching libc; an ORW/SROP plan needs syscall, frame and seccomp preconditions. Keep the first stage small and test each stage separately. Save binary payloads, not terminal-rendered strings. Confirm a fresh-process success before claiming recovery.

## Provenance

Adapted from MIT-licensed ljagiello/ctf-skills, commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Pinned general chapters, LICENSE and SOURCE.json are in the ctf-pwn skill. Per-challenge pwnable walkthroughs and upstream installer scripts are not bundled.

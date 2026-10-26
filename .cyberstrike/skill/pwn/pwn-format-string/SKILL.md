---
name: pwn-format-string
description: "Validate scoped CTF format-string leak/write primitives with exact argument and count tracking."
version: "1.0.0"
author: "ljagiello/ctf-skills; CyberStrike CTF adapters"
category: pwn
tags: [ctf, pwn]
tech_stack: [Python, WSL2, QEMU, GDB]
---

# Format strings
Read format-string. Measure the stack argument index and actual printf-family behavior. Distinguish literal/positional formatting restrictions, printf_chk, stdout buffering, writable memory and RELRO. Track exact printed byte counts, width, endianness and the size of each %n write.
Verify a benign read or controlled lab write before combining leaks and writes. Do not infer a usable arbitrary write from a crash. Recheck offsets after changing prefixes, transport or libc; persist the measured facts and avoid rerunning unrelated triage.

## Provenance

Adapted from MIT-licensed ljagiello/ctf-skills, commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Pinned general chapters, LICENSE and SOURCE.json are in the ctf-pwn skill. Per-challenge pwnable walkthroughs and upstream installer scripts are not bundled.

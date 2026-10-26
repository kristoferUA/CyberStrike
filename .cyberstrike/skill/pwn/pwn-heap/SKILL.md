---
name: pwn-heap
description: "Analyze scoped CTF heap lifetime/corruption primitives using the exact allocator and libc version."
version: "1.0.0"
author: "ljagiello/ctf-skills; CyberStrike CTF adapters"
category: pwn
tags: [ctf, pwn]
tech_stack: [Python, WSL2, QEMU, GDB]
---

# Heap and FILE structures
Read heap-techniques/heap-techniques-2 for the observed allocator, and heap-fsop only for an actual FILE primitive. Record libc build, tcache counts, sizes/alignment, safe-linking, pointer mangling, bin state, allocations/frees and the exact corrupted field.
Prove UAF, overlap, double-free or OOB before choosing a named House technique. Do not use removed malloc/free hooks on modern glibc or copy offsets between libc versions. Save an allocation transcript and inspect the shortest failing sequence in GDB. Verify local behavior outside the debugger and match remote libc/loader before adapting to its authorized service.

## Provenance

Adapted from MIT-licensed ljagiello/ctf-skills, commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Pinned general chapters, LICENSE and SOURCE.json are in the ctf-pwn skill. Per-challenge pwnable walkthroughs and upstream installer scripts are not bundled.

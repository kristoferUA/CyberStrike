---
name: pwn-kernel
description: "Route explicitly scoped kernel CTF artifacts into an isolated supplied VM and version-matched debugging."
version: "1.0.0"
author: "ljagiello/ctf-skills; CyberStrike CTF adapters"
category: pwn
tags: [ctf, pwn]
tech_stack: [Python, WSL2, QEMU, GDB]
---

# Kernel CTF
Read kernel and matching kernel-techniques/kernel-bypass sections. Inventory the supplied kernel, modules, initramfs/rootfs, launch script, symbols, config and mitigations. Use the challenge's dedicated disposable qemu-system VM; never load vulnerable modules or disable protections on the Windows/WSL host.
QEMU user-mode cannot reproduce kernel exploitation. Preserve supplied CPU/machine/rootfs settings and add a local-only GDB stub for the lab VM when needed. Match symbols and relocation to the running guest. Prove the primitive inside that guest and validate the actual CTF success condition; document assumptions and stop if the required VM image or explicit scope is missing.

## Provenance

Adapted from MIT-licensed ljagiello/ctf-skills, commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Pinned general chapters, LICENSE and SOURCE.json are in the ctf-pwn skill. Per-challenge pwnable walkthroughs and upstream installer scripts are not bundled.

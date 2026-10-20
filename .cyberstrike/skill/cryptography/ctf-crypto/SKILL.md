---
name: ctf-crypto
description: "Route and solve explicitly scoped cryptography CTF challenges with exact arithmetic, evidence, managed Python and SageCell."
version: "1.1.0"
author: "ljagiello/ctf-skills; CyberStrike CTF adapters"
category: cryptography
tags: [ctf, cryptography]
tech_stack: [Python, SageCell]
---

# CTF cryptography workflow

Use the challenge description, original source and supplied artifacts to identify a construction and its weakness. The objective is a reproducible solver and independently checked result.

## Start

1. Identify local inputs, flag format, allowed target and oracle/query budget. Do not invent missing inputs before looking at the current challenge directory.
2. Inspect source and artifacts before executing challenge programs. Use crypto_run(program="probe", args=["cipher.bin"]) for a bounded offline byte/entropy/repeated-block inventory.
3. Distinguish encodings, compression and serialization from encryption. List known values, unknowns and observations; preserve bytes and integer widths.
4. Load only one or two matching skills from the routing table. Use crypto_reference search/read to retrieve the relevant chapter sections.
5. Check crypto_environment only if the runtime is unknown or a dependency is missing. Local setup uses the hash-locked venv; Sage uses crypto_sage and the public API.

For custom few-round SPN/Feistel constructions, inspect algebraic degree, affine input sets and integral invariants before a generic SAT encoding. Search `integral`, `square` or `Feistel` and read matching sections. A promising measured invariant deserves a small discriminating experiment before broad alternative searches.

## Routing

| Construction | Skill | Reference topics |
| --- | --- | --- |
| Encodings, XOR, substitution, reused pads | crypto-classical | classic-ciphers, historical |
| RSA, factoring/leakage, CRT, low exponents | crypto-rsa | rsa-attacks, rsa-attacks-2 |
| AES/block modes, AEAD, hashes, MAC/KDF | crypto-symmetric | modern-ciphers, modern-ciphers-2, modern-ciphers-3, modern-ciphers-4 |
| Finite-field DH, curves, signature nonces | crypto-ecc-dh | dh-attacks, ecc-attacks |
| MT/LCG/xorshift/LFSR, stream ciphers | crypto-prng-stream | prng, prng-attacks, stream-ciphers |
| Lattices, HNP, Coppersmith, LWE/NTRU/PQC | crypto-lattice-pqc | advanced-math, lattice-and-lwe, post-quantum |
| Sharing, ZKP, commitments, unusual algebra | crypto-protocols | zkp-and-advanced, exotic-crypto, exotic-crypto-2 |

## Environment and evidence

Default solve mode: save the solver, check the candidate against the original construction, and return the result promptly. Optional crypto_methodology updates can record recovery and verification together; that tool hashes evidence artifacts itself. A full seven-phase report/writeup is for a user-requested report. Do not create separate calls merely to reach 100% on a checklist.

Combine related local measurements in one short script. crypto_run expects a path: {"program":"python","script":"solve.py","args":[]}. Use purpose="experiment" for initial hypotheses (30s default), then purpose="solve" or "verify" for established work (120s default). Longer budgets require a measured work estimate/progress justification. A timeout is not a negative mathematical result; change the model or technique unless new evidence supports retrying. Keep reasoning effort selected by the user unchanged.

SageCell receives code and embedded values remotely, is stateless and has a current 30-second job cap. Use self-contained code with print(), public challenge parameters, no local file paths or oracle connections. Public-service code must not contain unrelated credentials or recovered flags. Upstream installation snippets are informational; do not run the all-category installer.

Check exact roots, modular inverses, group membership/order, padding/endianness and attack preconditions. Use integer/rational arithmetic, never floating-point cryptographic integers. A plausible plaintext is a candidate until re-encryption, signature/equation verification or the challenge checker passes.

## Provenance

Adapted for CyberStrike from [ljagiello/ctf-skills](https://github.com/ljagiello/ctf-skills/tree/1fdf188cb7ac84a0a2697851aecab156f283e56b/ctf-crypto), commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Original references retain their MIT license and copyright; see the ctf-crypto skill's LICENSE and SOURCE.json. This adapter uses the CyberStrike crypto tools and SageCell backend, rather than the upstream all-category installer.

---
name: ctf-crypto
description: "Route and solve explicitly scoped cryptography CTF challenges with exact arithmetic, evidence, managed Python and SageCell."
version: "1.0.0"
author: "ljagiello/ctf-skills; CyberStrike CTF adapters"
category: cryptography
tags: [ctf, cryptography]
tech_stack: [Python, SageCell]
---

# CTF cryptography workflow

Use the challenge description, original source and supplied artifacts to identify a construction and its weakness. The objective is a reproducible solver and independently checked result.

## Start

1. Record inputs/hashes, flag format, allowed target and oracle/query budget with crypto_methodology.
2. Inspect source and artifacts before executing challenge programs. Use crypto_run(program="probe", args=["cipher.bin"]) for a bounded offline byte/entropy/repeated-block inventory.
3. Distinguish encodings, compression and serialization from encryption. List known values, unknowns and observations; preserve bytes and integer widths.
4. Load only one or two matching skills from the routing table. Use crypto_reference search/read to retrieve the relevant chapter sections.
5. Check the toolchain with crypto_environment. Local setup uses the hash-locked Python venv; Sage computations use crypto_sage and the public SageCell API.

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

The workflow is intake → classification → model → attack → recovery → verification → writeup. Save solve.py/solve.sage and logs; use crypto_methodology to record evidence and artifact hashes. Failed hypotheses belong in the record too.

SageCell receives code and embedded values remotely, is stateless and has a current 30-second job cap. Use self-contained code with print(), public challenge parameters, no local file paths or oracle connections. Public-service code must not contain unrelated credentials or recovered flags. Upstream installation snippets are informational; do not run the all-category installer.

Check exact roots, modular inverses, group membership/order, padding/endianness and attack preconditions. Use integer/rational arithmetic, never floating-point cryptographic integers. A plausible plaintext is a candidate until re-encryption, signature/equation verification or the challenge checker passes.

## Provenance

Adapted for CyberStrike from [ljagiello/ctf-skills](https://github.com/ljagiello/ctf-skills/tree/1fdf188cb7ac84a0a2697851aecab156f283e56b/ctf-crypto), commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Original references retain their MIT license and copyright; see the ctf-crypto skill's LICENSE and SOURCE.json. This adapter uses the CyberStrike crypto tools and SageCell backend, rather than the upstream all-category installer.

---
name: crypto-ecc-dh
description: "Solve CTF DH/ECC and signature-nonce problems with explicit groups, point orders, subgroup checks and exact verification."
version: "1.0.0"
author: "ljagiello/ctf-skills; CyberStrike CTF adapters"
category: cryptography
tags: [ctf, cryptography]
tech_stack: [Python, SageCell]
---

# DH, elliptic curves and signatures

## Model first

For finite-field DH record p, generator, group/subgroup order, public values and key derivation. For ECC record the base field, curve equation, base point, order/cofactor, point encoding, scalar reduction and validation behavior. Never mix the field modulus p with subgroup order n.

## Matching techniques

- Trivial DH generators/public values: compute the actual small candidate shared secrets and reproduce the KDF.
- Smooth group order: factor the relevant order and use Pohlig-Hellman/CRT only for justified subgroups. Estimate the remaining largest factor.
- Small-subgroup/invalid-curve cases: require missing checks, usable oracle behavior and the intended static-secret model. Bound and log challenge queries.
- Anomalous or pairing-friendly curves: establish the exact Smart/MOV prerequisites before using Sage routines.
- Reused ECDSA/DSA nonces: check shared r, message hashing/truncation and sign/low-s conventions. Recover candidate scalars locally, verify both signature equations and the public key.
- Biased/partial nonces: build the HNP equations and bounds; route to crypto-lattice-pqc.
- EdDSA/X25519/BLS-related problems: inspect subgroup/cofactor rules, encoding, all-zero/shared-secret checks and domain separation for the actual implementation.

Use local ecdsa/py-ecc/gmpy2 for supported constructions and verification. SageCell can handle short public group/curve calculations; do not assume it can fetch dependencies or maintain an oracle session.

References: ecc-attacks, dh-attacks, advanced-math. Save a verification transcript against the original group and KDF.

## Provenance

Adapted for CyberStrike from [ljagiello/ctf-skills](https://github.com/ljagiello/ctf-skills/tree/1fdf188cb7ac84a0a2697851aecab156f283e56b/ctf-crypto), commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Original references retain their MIT license and copyright; see the ctf-crypto skill's LICENSE and SOURCE.json. This adapter uses the CyberStrike crypto tools and SageCell backend, rather than the upstream all-category installer.

---
name: crypto-protocols
description: "Analyze CTF secret sharing, ZKP/transcripts, commitments and unusual algebraic constructions with explicit verification and reproducible writeups."
version: "1.0.0"
author: "ljagiello/ctf-skills; CyberStrike CTF adapters"
category: cryptography
tags: [ctf, cryptography]
tech_stack: [Python, SageCell]
---

# Protocols and unusual constructions

Start with a transcript and verifier model: parties, public statement, secrets, commitments, challenges, responses, randomness and domain separators. Identify exactly which values the attacker can choose and when.

## Branches

- Shamir/secret sharing: fix the field, x-coordinates, threshold and coefficient reuse model. Check duplicate points and invertibility before interpolation; validate on unused shares.
- Sigma/ZKP/Fiat-Shamir: inspect challenge entropy, transcript binding, serialization and domain separation. Reused randomness or setup leakage needs an explicit relation checked by the real verifier.
- Pairing/polynomial commitments: establish curve/subgroup, evaluation domain, setup assumptions and batch-verification equations; verify candidate witnesses with the original relation.
- Garbled circuits/custom hashes/semirings/braids/isogenies: reproduce the supplied algebra and encoding before adapting a named attack. Do not assume a semiring operation behaves like field arithmetic.
- Constraint solving: make integer vs bit-vector semantics explicit, set timeouts, and independently check any model returned by Z3.

Use local Python for transcript collection, final secret handling and verification; use SageCell for short public algebraic subproblems. Remote Sage cannot load local files, fetch an exploit library or sustain a network oracle session.

Finish with solve.py/solve.sage, artifact hashes, dependency versions, exact commands, derived equations and independent verification output. Keep the final flag in the local report unless the user asks to publish it. References: zkp-and-advanced, exotic-crypto, exotic-crypto-2; use advanced-math when the model is primarily algebraic.

## Provenance

Adapted for CyberStrike from [ljagiello/ctf-skills](https://github.com/ljagiello/ctf-skills/tree/1fdf188cb7ac84a0a2697851aecab156f283e56b/ctf-crypto), commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Original references retain their MIT license and copyright; see the ctf-crypto skill's LICENSE and SOURCE.json. This adapter uses the CyberStrike crypto tools and SageCell backend, rather than the upstream all-category installer.

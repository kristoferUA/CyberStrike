---
name: crypto-prng-stream
description: "Recover or constrain CTF PRNG/stream state from MT, LCG, xorshift, LFSR, truncated outputs and nonce/keystream reuse."
version: "1.0.0"
author: "ljagiello/ctf-skills; CyberStrike CTF adapters"
category: cryptography
tags: [ctf, cryptography]
tech_stack: [Python, SageCell]
---

# PRNG and stream-cipher reconstruction

Distinguish a generator's internal state, seed expansion, output function and any truncation/formatting. Record word width, overflow semantics, signedness, byte order, sample order, skipped calls and whether observations are full integers, floats or reductions.

## Workflow

1. Reproduce a tiny local instance of the exact update/output equations before solving a large state.
2. Choose full-state untempering, modular equations, GF(2) linear algebra, bit-vector constraints or a justified bounded seed search.
3. For LCGs verify modulus/multiplier/increment assumptions and noninvertible differences; truncated observations need additional constraints or a lattice model.
4. For MT19937 use randcrack only when sample width/order and sufficient consecutive outputs match its model. Float/partial observations need their actual bit constraints.
5. For xorshift/xoshiro/PCG model the output permutation and fixed-width wraps. For Z3 use BitVec for machine words, constrain shifts and set a solver timeout.
6. For LFSRs fix the Fibonacci/Galois convention, tap orientation and output bit; derive and verify a recurrence over GF(2).
7. Predict withheld observations before using a recovered state to derive challenge data. A fit to training samples alone is insufficient.

Keep collection scripts local and record the number/timing of allowed oracle calls. Save samples before analysis. Reference code must be adapted to the challenge's actual call schedule. References: prng, prng-attacks, stream-ciphers; use crypto-lattice-pqc for truncated-generator lattices.

## Provenance

Adapted for CyberStrike from [ljagiello/ctf-skills](https://github.com/ljagiello/ctf-skills/tree/1fdf188cb7ac84a0a2697851aecab156f283e56b/ctf-crypto), commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Original references retain their MIT license and copyright; see the ctf-crypto skill's LICENSE and SOURCE.json. This adapter uses the CyberStrike crypto tools and SageCell backend, rather than the upstream all-category installer.

---
name: crypto-symmetric
description: "Analyze CTF block/stream modes, AEAD nonce reuse, padding oracles, hashes, MACs, KDFs and custom symmetric constructions."
version: "1.1.0"
author: "ljagiello/ctf-skills; CyberStrike CTF adapters"
category: cryptography
tags: [ctf, cryptography]
tech_stack: [Python, SageCell]
---

# Symmetric ciphers, AEAD and hashes

Record key/nonce/IV/tag/block lengths, mode, AAD, padding, serialization and the exact oracle response. Separate encryption, authentication and parsing layers.

## Select by evidence

- ECB: repeated blocks are a clue; byte-at-a-time needs a stable secret, chosen input, alignment and a deterministic key/prefix model.
- CBC: distinguish bit-flipping, IV control, padding leakage and downstream format errors. Maintain a local oracle/query budget; verify a forged structure against the challenge.
- CTR/OFB/stream reuse: C1 XOR C2 = P1 XOR P2 requires the same aligned keystream. Confirm counter layout, nonce/key reuse and offsets.
- GCM/ChaCha20-Poly1305: derive the actual field/polynomial equations including AAD, lengths, padding, truncation and carry ambiguity. Reused nonces alone do not justify skipping authentication constraints.
- Hash length extension: applies to a matching secret-prefix Merkle-Damgard construction, not HMAC. Account for the unknown prefix length and exact glue padding.
- CBC-MAC/custom MAC/CRC: specify fixed/variable length, IV control, linearity and domain separation; demonstrate the exact accepted collision/forgery.
- Weak KDF or reduced cipher: estimate the real entropy/search cost and model every reduction. Do not brute-force an unbounded AES keyspace.

## Custom SPN / Feistel constructions

Start from the structure of supplied data: chosen affine sets, repeated differences, low-rank sums, missing dependencies or small matrix families. Determine each nonlinear layer's algebraic degree and which output bits remain linear. Across r quadratic layers the degree is at most 2^r; a sum over a complete d-dimensional affine set annihilates Boolean components of degree < d. Check that the set is complete, the chosen output components satisfy the bound, and the surrounding maps preserve the claimed invariant. This is a candidate technique, not a universal solution for custom ciphers.

If a final linear/affine layer comes from a small public family, use measured invariants to filter its candidates before modeling every round key in SAT. Constant XOR offsets cancel in an even-cardinality XOR sum: such an invariant cannot determine those offsets. Recover offsets from known input/output pairs after fixing the other parameters. Retain all surviving family candidates instead of assuming every position becomes unique; estimate the remaining Cartesian product and filter it against the original construction. Confirm predictions on independent samples. Use bounded SAT/SMT after exploiting available structure; a timeout does not establish unsatisfiability.

Search `integral` / `square` for the matching discussion in modern-ciphers-2, and `SPN` / `Feistel` for related constructions. Preserve exact field, matrix orientation and bit order when transferring a reference technique.

Use PyCryptodome/cryptography locally for modes and verification. Keep final keys and flags local. Save samples and a deterministic replay; verify ciphertext and tags with the original construction, not a simplified toy implementation.

Keep authenticated plaintext as bytes. Decode only when the format permits it; otherwise save binary and return hex. A UTF-8 decoding exception after a valid tag does not invalidate recovered bytes or justify another cryptanalytic search.

References: modern-ciphers and parts 2–4. Consult stream-ciphers for LFSR/RC4-family details.

## Provenance

Adapted for CyberStrike from [ljagiello/ctf-skills](https://github.com/ljagiello/ctf-skills/tree/1fdf188cb7ac84a0a2697851aecab156f283e56b/ctf-crypto), commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Original references retain their MIT license and copyright; see the ctf-crypto skill's LICENSE and SOURCE.json. This adapter uses the CyberStrike crypto tools and SageCell backend, rather than the upstream all-category installer.

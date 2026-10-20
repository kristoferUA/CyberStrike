---
name: crypto-symmetric
description: "Analyze CTF block/stream modes, AEAD nonce reuse, padding oracles, hashes, MACs, KDFs and custom symmetric constructions."
version: "1.0.0"
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

Use PyCryptodome/cryptography locally for modes and verification. Keep final keys and flags local. Save samples and a deterministic replay; verify ciphertext and tags with the original construction, not a simplified toy implementation.

References: modern-ciphers and parts 2–4. Consult stream-ciphers for LFSR/RC4-family details.

## Provenance

Adapted for CyberStrike from [ljagiello/ctf-skills](https://github.com/ljagiello/ctf-skills/tree/1fdf188cb7ac84a0a2697851aecab156f283e56b/ctf-crypto), commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Original references retain their MIT license and copyright; see the ctf-crypto skill's LICENSE and SOURCE.json. This adapter uses the CyberStrike crypto tools and SageCell backend, rather than the upstream all-category installer.

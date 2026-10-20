---
name: crypto-classical
description: "Analyze CTF encodings, classical ciphers, XOR/OTP reuse, transposition and known-plaintext structure."
version: "1.0.0"
author: "ljagiello/ctf-skills; CyberStrike CTF adapters"
category: cryptography
tags: [ctf, cryptography]
tech_stack: [Python, SageCell]
---

# Classical ciphers and encodings

## Triage

Preserve the original bytes and characterize the alphabet, length, entropy, repeated n-grams and separators. Hex/base64/URL encodings, compression and a cipher may be layered; record each reversible transformation instead of repeatedly decoding guessed formats. Check file magic and expected structure without assuming every artifact contains English.

## Attack choices

- Caesar/affine/substitution: identify the alphabet and invertible multiplier; rank candidates with language/domain constraints and verify the full artifact.
- Vigenere/repeating XOR: combine repeated-sequence distances, index of coincidence and key-length hypotheses. Do not trust a single high-scoring frequency guess.
- XOR known plaintext: align known bytes/header, derive a candidate keystream and validate on withheld bytes. crypto_run math xor requires equal-length hex inputs.
- Reused one-time pad: XOR ciphertext pairs, use justified cribs and propagate only confirmed positions. Distinguish an unknown byte from an actual zero.
- Transposition/book/homophonic schemes: write the precise indexing and tokenization convention; constrain the keyspace before enumeration.

## Verify

Re-encode/re-encrypt the full recovered message and compare byte-for-byte with the supplied artifact. Preserve length and padding; save the transformation chain, key and independent check locally.

References: crypto_reference topics classic-ciphers and historical. For a custom generator behind XOR, load crypto-prng-stream.

## Provenance

Adapted for CyberStrike from [ljagiello/ctf-skills](https://github.com/ljagiello/ctf-skills/tree/1fdf188cb7ac84a0a2697851aecab156f283e56b/ctf-crypto), commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Original references retain their MIT license and copyright; see the ctf-crypto skill's LICENSE and SOURCE.json. This adapter uses the CyberStrike crypto tools and SageCell backend, rather than the upstream all-category installer.

---
name: crypto-rsa
description: "Triage and solve scoped RSA CTF constructions: structural flaws, low exponents, leakage, related messages, CRT faults and oracle models."
version: "1.0.0"
author: "ljagiello/ctf-skills; CyberStrike CTF adapters"
category: cryptography
tags: [ctf, cryptography]
tech_stack: [Python, SageCell]
---

# RSA CTF methodology

## Inventory and cheap checks

Parse N, e, ciphertexts/signatures and any p/q/d/dp/dq/phi leakage exactly. Record byte order, padding and how the challenge converts messages. Use crypto_run math rsa N e [c] for size/range, square and gcd checks; it is not an arbitrary factoring engine.

| Observation | Candidate approach | Required check |
| --- | --- | --- |
| Multiple moduli | Pairwise/batch GCD | A nontrivial gcd divides each claimed modulus |
| Small e, no padding | Exact integer root | m^e is below N, or a justified bounded lift is used |
| Same message and coprime moduli | Broadcast/CRT | Correct plaintext relation, enough independent moduli, exact root |
| Same modulus, two exponents | Common modulus | Exponents' gcd and message invertibility are handled |
| Close primes | Bounded Fermat | Closeness is justified; recovered factors multiply to N |
| Small private exponent/leakage | Wiener, lattice/small roots | Bounds and leakage model match the theorem |
| Related plaintexts | Franklin-Reiter/Coppersmith | Polynomial ring, degree and padding relation are correct |
| Faulty CRT signature | GCD from a known faulty relation | A correct/faulty relation or known message is available |
| Padding/parity/timing oracle | Explicit adaptive model | Challenge scope, stable signal, error model and query budget |

Handle multi-prime moduli, p=q and gcd(e,lambda(N)) > 1 explicitly. Do not apply the ordinary two-distinct-prime totient formula to another structure. For noninvertible exponents, enumerate the mathematically justified roots and filter with the original relation.

## Solve and prove

Keep oracle I/O in local Python with timeouts and query accounting. SageCell is for short self-contained polynomial/lattice calculations over public inputs. Save recovered secrets locally. Verify every factor, inverse and candidate using the original ciphertext/signature equation and exact padding. An unsuccessful generic factorization attempt is not evidence of a vulnerability.

References: rsa-attacks, rsa-attacks-2; use crypto-lattice-pqc for lattice bounds and basis construction.

## Provenance

Adapted for CyberStrike from [ljagiello/ctf-skills](https://github.com/ljagiello/ctf-skills/tree/1fdf188cb7ac84a0a2697851aecab156f283e56b/ctf-crypto), commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Original references retain their MIT license and copyright; see the ctf-crypto skill's LICENSE and SOURCE.json. This adapter uses the CyberStrike crypto tools and SageCell backend, rather than the upstream all-category installer.

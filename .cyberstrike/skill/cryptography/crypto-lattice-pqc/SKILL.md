---
name: crypto-lattice-pqc
description: "Model CTF HNP, small roots, LWE/NTRU, lattice embeddings and PQC with explicit bounds, bases and candidate validation."
version: "1.0.0"
author: "ljagiello/ctf-skills; CyberStrike CTF adapters"
category: cryptography
tags: [ctf, cryptography]
tech_stack: [Python, SageCell]
---

# Lattices, small roots and PQC

## Required model

Write integer/modular equations and bounds before choosing LLL/BKZ. Record matrix dimensions, row/column convention, determinant, scaling, centering, embedding constant and how an output vector maps back to original unknowns. Use exact integer matrices, never a floating-point stand-in for a lattice basis.

## Technique selection

- Coppersmith: specify polynomial, modulus, degree, monicity/invertible leading coefficient, target root bounds, beta and the theorem being applied. Multivariate success is heuristic unless justified.
- HNP/partial nonces/truncated generators: derive signs, offsets, known-bit location and noise bounds; normalize the equations before constructing the basis.
- LWE/CVP/BDD: specify secret/error distributions, sample count, q, dimensions and embedding; estimate work instead of assuming every short vector is the solution.
- NTRU/Ring-/Module-LWE: preserve the polynomial quotient and cyclic/negacyclic convention. Check transpose/order when flattening a module construction.
- Knapsack/GGH: justify density or embedding parameters and validate every candidate against the original target.
- PQC identification: recognize ML-KEM/ML-DSA/Falcon parameters and implementation differences. An algorithm name is not a break; identify the concrete leakage, malformed-parameter or oracle assumption.

Local tools include SymPy integer DomainMatrix LLL and Z3; the managed Windows profile deliberately does not try to compile fpylll or install Sage locally. Use crypto_sage for short self-contained Sage lattice/ring operations. Its current 30-second cap excludes large reductions: report that limitation rather than repeatedly restarting or bypassing service limits. Do not assume optional packages exist on SageCell.

Verification must substitute the candidate into the original equations, including noise bounds and all public samples. References: advanced-math, lattice-and-lwe, post-quantum. Source examples may use local packages; translate them to available APIs and check dimensions carefully.

## Provenance

Adapted for CyberStrike from [ljagiello/ctf-skills](https://github.com/ljagiello/ctf-skills/tree/1fdf188cb7ac84a0a2697851aecab156f283e56b/ctf-crypto), commit `1fdf188cb7ac84a0a2697851aecab156f283e56b`. Original references retain their MIT license and copyright; see the ctf-crypto skill's LICENSE and SOURCE.json. This adapter uses the CyberStrike crypto tools and SageCell backend, rather than the upstream all-category installer.

# Cryptography runtime and decisions

Read the local `ctf-crypto` workflow and the specialist that matches the construction: `crypto-rsa`, `crypto-symmetric`, `crypto-ecc-dh`, `crypto-prng-stream`, `crypto-lattice-pqc`, `crypto-classical` or `crypto-protocols`. Retrieve the corresponding reference sections before choosing an attack.

Check `cyberstrike crypto status` when the runtime is unknown. On an authorized setup request, `cyberstrike crypto setup` creates the isolated, hash-locked Python 3.12 environment. Windows Sage computations use the public SageCell API; local Sage/WSL/Docker installation is not required for this category. The located checkout's `docs/cryptography.uk.md` has full setup details.

Useful direct CLI operations:

```text
cyberstrike crypto probe cipher.bin
cyberstrike crypto run solve.py
cyberstrike crypto sage experiment.sage
```

`crypto run` has a larger internal ceiling; enforce the task's shorter experiment budget with the native shell timeout. When MCP is connected, `crypto_run` accepts a saved script path, for example `{"program":"python","script":"solve.py","args":[],"purpose":"experiment"}`; use `solve` or `verify` for established work. Use the advertised schema for supported timeout and justification fields.

For RSA with an approved public modulus and permitted network disclosure, query `https://factordb.com/api?query=<decimal-N>` once before generic local factoring. Use a bounded fetch and validate returned factors, multiplicities, their product and primality locally. Cache the lookup. Respect offline restrictions and do not attempt unbounded generic factoring of a large balanced modulus without an exploitable weakness or credible work estimate.

For custom few-round SPN/Feistel ciphers, inspect algebraic degree, affine sets and integral/rank invariants before a broad SAT encoding. Search the local reference for `integral`, `square` or `Feistel` and run a small distinguishing experiment.

SageCell jobs are stateless and currently capped at 30 seconds. Send only self-contained code with permitted public challenge parameters and small printed results. Keep local file access, oracle collection, private keys and final verification local. Do not send flags, credentials or unrelated data, auto-accept terms, or retry unchanged failed jobs repeatedly.

Verify exact roots, modular arithmetic, padding, endian conventions and the recovered candidate against the original challenge. Binary plaintext can be a valid result; preserve it as bytes/hex and report the supplied flag-format limitation honestly.

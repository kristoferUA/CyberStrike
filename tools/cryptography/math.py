"""Exact local arithmetic helpers. Integers are returned as strings to preserve precision."""
import argparse
import json
import math
import gmpy2
from sympy.ntheory.modular import solve_congruence

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("operation", choices=["gcd", "inverse", "root", "crt", "rsa", "xor"])
parser.add_argument("values", nargs="+")
args = parser.parse_args()

def integer(value):
    return int(value, 16) if value.lower().startswith(("0x", "-0x")) else int(value, 10)

if args.operation == "xor":
    if len(args.values) != 2:
        parser.error("xor needs two equal-length hex strings")
    left, right = (bytes.fromhex(x) for x in args.values)
    if len(left) != len(right):
        parser.error("xor inputs must have equal byte lengths")
    result = {"hex": bytes(a ^ b for a, b in zip(left, right)).hex()}
else:
    values = [integer(x) for x in args.values]
    if args.operation == "gcd":
        result = {"gcd": str(math.gcd(*values))}
    elif args.operation == "inverse":
        if len(values) != 2 or values[1] <= 1:
            parser.error("inverse needs a value and modulus > 1")
        result = {"inverse": str(pow(values[0], -1, values[1]))}
    elif args.operation == "root":
        if len(values) != 2 or values[0] < 0 or not 1 <= values[1] <= 65536:
            parser.error("root needs a nonnegative integer and degree in 1..65536")
        root, exact = gmpy2.iroot(*values)
        result = {"root": str(root), "exact": bool(exact)}
    elif args.operation == "crt":
        if len(values) % 2 or any(n <= 1 for n in values[1::2]):
            parser.error("crt needs residue/modulus pairs, each modulus > 1")
        solved = solve_congruence(*zip(values[::2], values[1::2]))
        result = {"consistent": solved is not None, "residue": str(solved[0]) if solved else None,
                  "modulus": str(solved[1]) if solved else None}
    else:
        if not 2 <= len(values) <= 3 or values[0] <= 1 or values[1] <= 0:
            parser.error("rsa needs N, e and optional ciphertext")
        n, e = values[:2]
        root = math.isqrt(n)
        result = {"bits": n.bit_length(), "odd": bool(n % 2), "gcd_n_e": str(math.gcd(n, e)),
                  "perfect_square": root * root == n, "square_root": str(root) if root * root == n else None,
                  "e": str(e), "note": "Structural triage only; this does not factor arbitrary RSA moduli."}
        if len(values) == 3:
            result["ciphertext_in_range"] = 0 <= values[2] < n
            result["gcd_n_c"] = str(math.gcd(n, values[2]))
print(json.dumps(result, indent=2))

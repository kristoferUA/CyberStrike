"""Report the managed interpreter and installed distributions without importing challenge code."""
import importlib.metadata
import json
import platform
import sys

PACKAGES = [
    "pycryptodome", "sympy", "gmpy2", "z3-solver", "numpy", "scipy",
    "galois", "ecdsa", "py-ecc", "cryptography", "randcrack", "requests", "httpx",
]
versions = {}
for package in PACKAGES:
    try:
        versions[package] = importlib.metadata.version(package)
    except importlib.metadata.PackageNotFoundError:
        versions[package] = None
print(json.dumps({"python": sys.executable, "version": platform.python_version(),
                  "packages": versions, "ready": all(versions.values())}))

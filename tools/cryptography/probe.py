"""Bounded, offline ciphertext triage. Reads data; never executes it."""
import argparse
import collections
import hashlib
import json
import math
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("file", type=Path)
parser.add_argument("--sample-bytes", type=int, default=1048576)
args = parser.parse_args()
if not 1 <= args.sample_bytes <= 16777216:
    parser.error("sample-bytes must be between 1 and 16777216")
digest = hashlib.sha256()
sample = bytearray()
size = 0
with args.file.open("rb") as stream:
    for block in iter(lambda: stream.read(1048576), b""):
        digest.update(block)
        size += len(block)
        sample.extend(block[: max(0, args.sample_bytes - len(sample))])
counts = collections.Counter(sample)
entropy = -sum((n / len(sample)) * math.log2(n / len(sample)) for n in counts.values()) if sample else 0.0
repeated = {}
for width in (8, 16, 32):
    blocks = [bytes(sample[i:i + width]) for i in range(0, len(sample) - width + 1, width)]
    histogram = collections.Counter(blocks)
    repeated[str(width)] = {"complete_blocks": len(blocks), "duplicate_occurrences": sum(n - 1 for n in histogram.values()),
                            "distinct_repeated_blocks": sum(n > 1 for n in histogram.values())}
text = bytes(sample).strip()
print(json.dumps({"file": str(args.file.resolve()), "bytes": size, "sha256": digest.hexdigest(),
                  "sample_bytes": len(sample), "entropy_bits_per_byte": entropy,
                  "prefix_hex": bytes(sample[:64]).hex(), "repeated_blocks": repeated,
                  "ascii_hex_candidate": bool(text) and len(text) % 2 == 0 and all(c in b"0123456789abcdefABCDEF" for c in text),
                  "note": "Encoding and repeated-block indicators are hypotheses, not proof of a cipher or a vulnerability."}, indent=2))

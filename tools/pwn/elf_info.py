"""Read ELF metadata without shadowing Python's standard inspect module."""
import hashlib
import json
import pathlib
import sys
from pwnlib.elf.elf import ELF

file = pathlib.Path(sys.argv[1]).resolve(strict=True)
elf = ELF(str(file), checksec=False)
result = {
    'file': str(file), 'sha256': hashlib.sha256(file.read_bytes()).hexdigest(),
    'arch': elf.arch, 'bits': elf.bits, 'endian': elf.endian,
    'entry': hex(elf.entry), 'pie': elf.pie, 'nx': elf.nx,
    'relro': elf.relro, 'canary': elf.canary, 'stripped': elf.stripped,
    'staticallyLinked': elf.statically_linked,
    'symbols': {k: hex(v) for k, v in list(elf.symbols.items())[:200]},
    'plt': {k: hex(v) for k, v in list(elf.plt.items())[:100]},
    'got': {k: hex(v) for k, v in list(elf.got.items())[:100]},
    'note': 'Static properties only; libc, loader, ASLR and the target runtime still need validation.',
}
print(json.dumps(result, indent=2))

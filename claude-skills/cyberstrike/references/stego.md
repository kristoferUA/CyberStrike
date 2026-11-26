# Steganography

Read `ctf-stego` and the matching topic via `cyberstrike knowledge read triage --category stego`. Topics `png`, `wav` and `verification` cover the format-specific checks.

Start with `cyberstrike stego inspect <file>`. Choose a single check based on the structure and challenge clues:

- `stego bytes` verifies exact offsets in the file.
- `stego bits` previews a sample bit in supported PNG or PCM WAV.
- `stego spectrum <file> --out <new.png>` writes a spectrogram for a frequency clue.

Connected MCP exposes the matching `stego_inspect`, `stego_bytes`, `stego_bits`, `stego_spectrum` and `stego_reference` tools. Use the registered schemas. Keep the original file unchanged, report its SHA-256 and the exact reproduction settings, and leave recovered data unexecuted. The local CLI needs neither WSL nor Python.

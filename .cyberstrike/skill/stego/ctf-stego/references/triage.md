# Container and metadata triage

Start with `cyberstrike stego inspect artifact`. Record detected format, file size and SHA-256. If the extension and signature disagree, use the structure shown by the bytes. The SHA-256 identifies the input and is useful when the same filename has been edited or exported.

## Boundaries and hints

- For PNG, use the `IEND` boundary and CRC report. The `trailing` offset is zero-based and separate from any data inside a PNG chunk. Compare the offset and byte count with the challenge description.
- For RIFF/WAVE, use the declared RIFF size plus 8 bytes. The parser accounts for the padding byte after odd-length chunks. A sample region starts at the `data` chunk payload, which is not necessarily at byte 44.
- Plain PNG text chunks and short flag-shaped strings can give quick leads. A compressed text chunk may show in the chunk inventory without a readable preview. Text hints cover the first and last 64 KiB of the file.
- For other formats, the initial bytes provide a signature-based lead. `zip` on a tail means the bytes match a common ZIP prefix. Confirm the structure before treating it as an archive. Stay with offline byte inspection.

After inspection, choose the most supported hypothesis. A recognizable marker or a noisy bit plane alone is weak evidence. Work on a copy if an external viewer or editor would rewrite metadata.

Sources [W3C PNG format](https://www.w3.org/TR/png/) and [Microsoft RIFF layout](https://learn.microsoft.com/en-us/windows/win32/xaudio2/resource-interchange-file-format--riff-).

# PNG chunks, pixels and bit planes

## Metadata or a trailer

Check `tEXt`, `iTXt` and `zTXt` in the chunk list. The byte offset in a chunk record refers to its length field. Its payload starts 8 bytes later. A tail after a valid `IEND` sits outside the PNG datastream. Confirm which region the clue refers to before inspecting sample planes.

## Read an indicated plane

```text
cyberstrike stego bits picture.png --channels r --bit 0 --order msb --offset 0 --bytes 64
```

The command inflates IDAT and reverses the PNG row filters before reading samples. It supports static, non-interlaced, 8-bit grayscale, grayscale-alpha, RGB and RGBA. For grayscale use `gray`, or `a` when present. For RGB(A), the channel letters specify extraction order, so `rgb` and `bgr` represent different tests. The offset is in pixels from the top left, proceeding row by row. Bit 0 is the least significant sample bit. `msb` puts the first collected bit in bit 7 of the output byte. `lsb` puts it in bit 0.

The metadata parser can inspect palette, interlaced and 16-bit PNG containers, but their sample layouts are outside this decoder. Converting to a different color layout can destroy the original evidence. JPEG coefficients are also outside PNG sample analysis.

Reproduce a candidate with the same channel order, bit index, packing and pixel offset. Open just the region supported by the clue. A failed single plane does not rule out hidden data.

Source [W3C PNG specification](https://www.w3.org/TR/png/).

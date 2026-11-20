# WAV sample bits and spectrograms

Inspect the RIFF extent, format tag, channel count, sample rate, integer sample depth and frame count. WAV is a container. These tools use PCM format tag 1 with one aligned `data` chunk and 8, 16, 24 or 32 bits per sample.

## Sample clue

```text
cyberstrike stego bits tone.wav --channels 1 --bit 0 --order msb --offset 0 --bytes 64
```

The channel index starts at zero. `all` reads channels in their frame order. The offset counts frames, not bytes, and applies before a channel is selected. This matters for stereo and for samples wider than one byte.

## Frequency or timing clue

```text
cyberstrike stego spectrum tone.wav --channel 0 --start 2 --duration 4 --fft 512 --out spectrum.png
```

The PNG uses time from left to right and frequency from low at the bottom to Nyquist at the top. Brightness is relative to the strongest bin in that render over a 70 dB range. FFT 512 is a useful first look. Increase the FFT for closer frequencies, or narrow the time window when sparse columns miss short marks. Open the exported PNG and record the useful time and frequency range. Use a fresh filename for each useful view.

Use a waveform timing hypothesis only when pulses or the challenge text support it. For compressed WAV codecs and floating-point WAV, report the unsupported sample layout.

Source [Microsoft RIFF/WAVE](https://learn.microsoft.com/en-us/windows/win32/xaudio2/resource-interchange-file-format--riff-).

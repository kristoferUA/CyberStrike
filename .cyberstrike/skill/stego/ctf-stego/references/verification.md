# Verify a candidate

Record the original input SHA-256 and the exact command. For bytes inside a container, include the zero-based offset and region. For samples, include channel order, sample bit, frame/pixel offset and byte packing. For a visual clue record the channel, FFT size, time range and output filename.

Use the expected flag format from the challenge. A promising readable chunk or bit preview is evidence only once it can be reproduced and distinguished from the surrounding bytes. Keep a binary result in hex when there is no evidence that it should be text.

Use a second measurement only when it answers a remaining question. A different channel on stereo audio can resolve a channel clue. A cropped time range can test a faint spectrogram pattern. Avoid rerunning the same check or changing several settings at once.

Return the verified finding and reproduction command. If the result remains uncertain, report the exact checked paths and parameters and the limitation preventing a stronger conclusion.

import { expect, test } from "bun:test"
import { crc32, deflateSync } from "node:zlib"
import { Buffer } from "node:buffer"
import path from "node:path"
import { BitOptions, bits, spectrum, SpectrumOptions } from "../../src/stego/analysis"
import { inspect, PNG_SIGNATURE, pngPixels, previewBytes, wave } from "../../src/stego/media"
import { spectrumPath, writeSpectrum } from "../../src/stego/output"
import { tmpdir } from "../fixture/fixture"

function pngChunk(name: string, data: Buffer) {
  const size = Buffer.alloc(4)
  const checksum = Buffer.alloc(4)
  size.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(name, "ascii"), data])
  checksum.writeUInt32BE(crc32(body))
  return Buffer.concat([size, body, checksum])
}

function filteredPng(text: string) {
  const width = text.length * 8
  const rgb = Buffer.alloc(width * 3)
  for (let i = 0; i < width; i++) rgb[i * 3] = 40 + ((text.charCodeAt(i >>> 3) >> (7 - (i % 8))) & 1)
  const row = Buffer.from([1, ...rgb.map((value, i) => value - (i < 3 ? 0 : rgb[i - 3]))])
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width)
  header.writeUInt32BE(1, 4)
  header[8] = 8
  header[9] = 2
  const compressed = deflateSync(row)
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("tEXt", Buffer.from("Comment\0synthetic test")),
    pngChunk("IDAT", compressed.subarray(0, 6)),
    pngChunk("IDAT", compressed.subarray(6)),
    pngChunk("IEND", Buffer.alloc(0)),
    Buffer.from("tail"),
  ])
}

function pcmFixture(text: string) {
  const rate = 8000
  const format = Buffer.alloc(16)
  format.writeUInt16LE(1)
  format.writeUInt16LE(2, 2)
  format.writeUInt32LE(rate, 4)
  format.writeUInt32LE(rate * 4, 8)
  format.writeUInt16LE(4, 12)
  format.writeUInt16LE(16, 14)
  const audio = Buffer.alloc(rate * 4)
  for (let frame = 0; frame < rate; frame++) {
    audio.writeInt16LE(Math.round(13_000 * Math.sin((frame * 2 * Math.PI) / 8)), frame * 4)
    if (frame >= 3 && frame < text.length * 8 + 3) {
      const bit = frame - 3
      audio.writeInt16LE((text.charCodeAt(bit >>> 3) >> bit % 8) & 1, frame * 4 + 2)
    }
  }
  function riffChunk(name: string, data: Buffer) {
    const size = Buffer.alloc(4)
    size.writeUInt32LE(data.length)
    return Buffer.concat([Buffer.from(name), size, data, Buffer.alloc(data.length % 2)])
  }
  const payload = Buffer.concat([
    Buffer.from("WAVE"),
    riffChunk("fmt ", format),
    riffChunk("JUNK", Buffer.from([42])),
    riffChunk("data", audio),
  ])
  const size = Buffer.alloc(4)
  size.writeUInt32LE(payload.length)
  return Buffer.concat([Buffer.from("RIFF"), size, payload])
}

test("triages a PNG trailer and recovers text after reversing the Sub row filter", () => {
  const message = "flag{plane}"
  const original = filteredPng(message)
  const info = inspect(original)
  expect(info).toMatchObject({
    format: "png",
    crcFailures: [],
    chunkCount: 5,
    textChunks: [{ type: "tEXt", keyword: "Comment", preview: "synthetic test", offset: 41 }],
    trailing: { offset: original.length - 4, size: 4, signature: "unknown" },
  })
  expect(previewBytes(original, original.length - 4, 8).preview).toBe("tail")
  const result = bits(original, BitOptions.parse({ channels: "r", bytes: message.length }))
  expect(result.preview).toBe(message)
  expect(result.textHints).toEqual([{ byteOffset: 0, text: message }])
  expect(bits(original, BitOptions.parse({ channels: "b", bytes: message.length })).preview).not.toBe(message)
})

test("reads a stereo WAV bit stream despite odd-sized metadata and finds the known 1 kHz tone", () => {
  const message = "flag{wave}"
  const original = pcmFixture(message)
  expect(wave(original)).toMatchObject({ rate: 8000, frames: 8000, channels: 2, supported: true })
  expect(
    bits(original, BitOptions.parse({ channels: "1", offset: 3, order: "lsb", bytes: message.length })).preview,
  ).toBe(message)
  const rendered = spectrum(original, SpectrumOptions.parse({ columns: 32 }))
  expect(rendered.metadata).toMatchObject({ sampleRate: 8000, peakHz: 1000, maxHz: 4000 })
  const image = pngPixels(rendered.image)
  expect(image.width).toBe(32)
  expect(image.height).toBe(257)
  expect(image.sample((256 - 64) * 32 + 16, 0)).toBeGreaterThan(200)
})

test("rejects truncated containers and oversized PNG inflation before sample analysis", () => {
  const truncated = pcmFixture("x").subarray(0, 40)
  expect(inspect(truncated)).toMatchObject({
    format: "wav",
    size: 40,
    structureError: expect.stringContaining("RIFF length"),
  })
  expect(() => wave(truncated)).toThrow("RIFF length")
  const header = Buffer.alloc(13)
  header.writeUInt32BE(1)
  header.writeUInt32BE(1, 4)
  header[8] = 8
  const mismatch = Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(Buffer.alloc(1000))),
    pngChunk("IEND", Buffer.alloc(0)),
  ])
  expect(() => pngPixels(mismatch)).toThrow()
})

test("writes a new valid spectrogram PNG without replacing an existing file", async () => {
  await using dir = await tmpdir()
  const input = path.join(dir.path, "tone.wav")
  await Bun.write(input, pcmFixture("x"))
  const output = await spectrumPath(path.join(dir.path, "spectrum.png"))
  const options = SpectrumOptions.parse({ columns: 32 })
  await writeSpectrum(input, output, options)
  const before = Buffer.from(await Bun.file(output).arrayBuffer())
  expect(inspect(before).format).toBe("png")
  await expect(writeSpectrum(input, output, options)).rejects.toThrow()
  expect(Buffer.from(await Bun.file(output).arrayBuffer()).equals(before)).toBe(true)
})

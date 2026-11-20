import { Buffer } from "node:buffer"
import { crc32, deflateSync } from "node:zlib"
import z from "zod"
import { isWave, MAX_FILE_BYTES, PNG_SIGNATURE, pngPixels, wave } from "./media"

export const BitOptions = z.object({
  channels: z
    .string()
    .min(1)
    .max(8)
    .optional()
    .describe("PNG: gray, r, g, b, a, rgb, bgr, rgba. WAV: all or a zero-based channel index."),
  bit: z.number().int().min(0).max(7).default(0),
  order: z.enum(["msb", "lsb"]).default("msb").describe("Order in which successive samples fill each output byte."),
  offset: z.number().int().min(0).max(MAX_FILE_BYTES).default(0).describe("Zero-based pixel or audio frame offset."),
  bytes: z.number().int().min(1).max(512).default(128).describe("Maximum decoded bytes."),
})

export const ByteOptions = z.object({
  offset: z.number().int().min(0).max(MAX_FILE_BYTES).default(0).describe("Zero-based file offset."),
  length: z.number().int().min(1).max(512).default(64),
})

function samples(bytes: Buffer, channelSelection?: string) {
  if (isWave(bytes)) {
    const audio = wave(bytes)
    if (!audio.supported || audio.frames === null)
      throw new Error("Expected an integer PCM WAV with one aligned data chunk.")
    const channel = channelSelection ?? "0"
    if (channel !== "all" && (!/^\d+$/.test(channel) || Number(channel) >= audio.channels))
      throw new Error("Choose all or a zero-based WAV channel index.")
    return {
      layout: "wav",
      frames: audio.frames,
      channels: channel === "all" ? Array.from({ length: audio.channels }, (_, i) => i) : [Number(channel)],
      sample: audio.sample,
    }
  }
  const image = pngPixels(bytes)
  const grey = image.layout.startsWith("gray")
  const channel = channelSelection ?? (grey ? "gray" : "rgb")
  const map = grey ? { gray: 0, a: image.stride === 2 ? 1 : -1 } : { r: 0, g: 1, b: 2, a: image.stride === 4 ? 3 : -1 }
  const names = channel === "gray" ? ["gray"] : [...channel]
  if (new Set(names).size !== names.length) throw new Error("Choose each PNG channel at most once.")
  const channels = names.map((name) => {
    const index = map[name as keyof typeof map]
    if (index === undefined || index < 0) throw new Error(`Channel ${name} is unavailable for ${image.layout} PNG.`)
    return index
  })
  return { layout: image.layout, frames: image.width * image.height, channels, sample: image.sample }
}

export function bits(bytes: Buffer, options: z.infer<typeof BitOptions>) {
  const source = samples(bytes, options.channels)
  const available = Math.max(0, source.frames - options.offset) * source.channels.length
  const result = Buffer.alloc(Math.min(options.bytes, Math.floor(available / 8)))
  for (let i = 0; i < result.length * 8; i++) {
    const count = source.channels.length
    const value = source.sample(options.offset + Math.floor(i / count), source.channels[i % count])
    const shift = options.order === "msb" ? 7 - (i % 8) : i % 8
    result[i >>> 3] |= ((value >>> options.bit) & 1) << shift
  }
  const ascii = result.toString("latin1")
  return {
    layout: source.layout,
    channelIndices: source.channels,
    ...options,
    decodedBytes: result.length,
    hex: result.toString("hex"),
    preview: ascii.replace(/[^ -~]/g, "."),
    textHints: Array.from(ascii.matchAll(/\b(?:flag|ctf)\{[ -~]{1,96}?\}/gi), (match) => ({
      byteOffset: match.index,
      text: match[0],
    })),
  }
}

export const SpectrumOptions = z.object({
  channel: z.number().int().min(0).max(31).default(0),
  columns: z.number().int().min(32).max(384).default(256),
  fft: z.union([z.literal(256), z.literal(512), z.literal(1024), z.literal(2048)]).default(512),
  start: z.number().min(0).max(86_400).default(0).describe("Start time in seconds."),
  duration: z
    .number()
    .positive()
    .max(86_400)
    .optional()
    .describe("Seconds to display; omit to use the remaining frames."),
})

function fft(real: Float64Array, imag: Float64Array) {
  const n = real.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    while (j & bit) {
      j ^= bit
      bit >>= 1
    }
    j ^= bit
    if (j > i) [real[i], real[j]] = [real[j], real[i]]
  }
  for (let len = 2; len <= n; len *= 2) {
    const half = len / 2
    const cos = Math.cos((-2 * Math.PI) / len)
    const sin = Math.sin((-2 * Math.PI) / len)
    for (let start = 0; start < n; start += len) {
      let re = 1
      let im = 0
      for (let j = start; j < start + half; j++) {
        const k = j + half
        const r = real[k] * re - imag[k] * im
        const i = real[k] * im + imag[k] * re
        real[k] = real[j] - r
        imag[k] = imag[j] - i
        real[j] += r
        imag[j] += i
        const next = re * cos - im * sin
        im = re * sin + im * cos
        re = next
      }
    }
  }
}

function chunk(name: string, payload: Buffer) {
  const bytes = Buffer.alloc(payload.length + 12)
  bytes.writeUInt32BE(payload.length)
  bytes.write(name, 4, 4, "ascii")
  payload.copy(bytes, 8)
  bytes.writeUInt32BE(crc32(bytes.subarray(4, -4)), bytes.length - 4)
  return bytes
}

export function spectrum(bytes: Buffer, options: z.infer<typeof SpectrumOptions>) {
  const audio = wave(bytes)
  if (!audio.supported || !audio.frames) throw new Error("A spectrogram requires a non-empty integer PCM WAV.")
  if (options.channel >= audio.channels) throw new Error("WAV channel is out of range.")
  const start = Math.floor(options.start * audio.rate)
  const end =
    options.duration === undefined
      ? audio.frames
      : Math.min(audio.frames, start + Math.ceil(options.duration * audio.rate))
  if (start >= end) throw new Error("The requested time range contains no audio frames.")

  const { columns, fft: size } = options
  const rows = size / 2 + 1
  const levels = new Float64Array(columns * rows)
  const real = new Float64Array(size)
  const imag = new Float64Array(size)
  const window = real.map((_, n) => 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (size - 1)))
  let peak = 0
  let peakBin = 0
  for (let x = 0; x < columns; x++) {
    const center = start + Math.round((x * (end - start - 1)) / (columns - 1))
    imag.fill(0)
    for (let i = 0; i < size; i++) {
      const frame = center + i - size / 2
      real[i] = frame < start || frame >= end ? 0 : audio.sample(frame, options.channel) * window[i]
    }
    fft(real, imag)
    for (let y = 0; y < rows; y++) {
      const bin = rows - y - 1
      const level = Math.hypot(real[bin], imag[bin])
      levels[y * columns + x] = level
      if (level > peak) {
        peak = level
        peakBin = bin
      }
    }
  }
  const rowsWithFilters = Buffer.alloc(rows * (columns + 1))
  if (peak > 0) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const ratio = levels[y * columns + x] / peak
        rowsWithFilters[y * (columns + 1) + x + 1] = Math.round(255 * Math.max(0, 1 + (20 * Math.log10(ratio)) / 70))
      }
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(columns, 0)
  header.writeUInt32BE(rows, 4)
  header[8] = 8
  return {
    image: Buffer.concat([
      PNG_SIGNATURE,
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(rowsWithFilters)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
    metadata: {
      width: columns,
      height: rows,
      channel: options.channel,
      sampleRate: audio.rate,
      fft: size,
      startSeconds: start / audio.rate,
      endSeconds: end / audio.rate,
      maxHz: audio.rate / 2,
      peakHz: peak > 0 ? (peakBin * audio.rate) / size : null,
      rangeDb: 70,
    },
  }
}

import { Buffer } from "node:buffer"
import { open, stat } from "node:fs/promises"
import path from "node:path"
import { crc32, inflateSync } from "node:zlib"

export const MAX_FILE_BYTES = 32 * 1024 * 1024
const MAX_IMAGE_BYTES = 16 * 1024 * 1024
const MAX_CHUNKS = 4096
export const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

export function localPath(name: string) {
  const file = path.resolve(name)
  if (process.platform === "win32" && file.startsWith("\\\\"))
    throw new Error("Choose a local file path without a UNC share or device prefix.")
  return file
}

export function previewBytes(bytes: Buffer, offset: number, length: number) {
  if (offset > bytes.length) throw new Error("Byte offset is past the end of the file.")
  const region = bytes.subarray(offset, offset + length)
  return {
    offset,
    size: region.length,
    hex: region.toString("hex"),
    preview: region.toString("latin1").replace(/[^ -~]/g, "."),
  }
}

export async function readMedia(file: string, signal?: AbortSignal) {
  signal?.throwIfAborted()
  file = localPath(file)
  const info = await stat(file)
  if (!info.isFile()) throw new Error("Choose a regular local file.")
  if (info.size > MAX_FILE_BYTES) throw new Error("Stego input exceeds 32 MiB.")
  const handle = await open(file, "r")
  try {
    const bytes = Buffer.alloc(info.size + 1)
    let offset = 0
    while (offset < bytes.length) {
      signal?.throwIfAborted()
      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset)
      if (!bytesRead) break
      offset += bytesRead
    }
    if (offset !== info.size) throw new Error("The file size changed while reading. Retry with an unchanged copy.")
    return bytes.subarray(0, offset)
  } finally {
    await handle.close()
  }
}

function id(bytes: Buffer, offset: number) {
  return bytes.toString("latin1", offset, offset + 4)
}

type Chunk = { type: string; offset: number; size: number }
type PngChunk = Chunk & { crcOk: boolean }

export function png(bytes: Buffer) {
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("Expected a PNG signature.")
  const chunks: PngChunk[] = []
  let end = 8
  while (end + 12 <= bytes.length && chunks.length < MAX_CHUNKS) {
    const size = bytes.readUInt32BE(end)
    const type = id(bytes, end + 4)
    const next = end + 12 + size
    if (next > bytes.length || !/^[A-Za-z]{4}$/.test(type)) throw new Error(`Invalid PNG chunk at byte ${end}.`)
    const crcOk = crc32(bytes.subarray(end + 4, next - 4)) === bytes.readUInt32BE(next - 4)
    chunks.push({ type, offset: end, size, crcOk })
    end = next
    if (type === "IEND") break
  }
  const header = chunks[0]
  if (header?.type !== "IHDR" || header.size !== 13 || chunks.at(-1)?.type !== "IEND" || chunks.at(-1)?.size !== 0)
    throw new Error("PNG requires a 13-byte IHDR and an empty IEND within the chunk limit.")
  const width = bytes.readUInt32BE(16)
  const height = bytes.readUInt32BE(20)
  if (!width || !height) throw new Error("PNG dimensions must be positive.")
  return {
    width,
    height,
    depth: bytes[24],
    color: bytes[25],
    compression: bytes[26],
    filter: bytes[27],
    interlace: bytes[28],
    animated: chunks.some((chunk) => chunk.type === "acTL"),
    chunks,
    end,
  }
}

function paeth(left: number, above: number, diagonal: number) {
  const estimate = left + above - diagonal
  const a = Math.abs(estimate - left)
  const b = Math.abs(estimate - above)
  const c = Math.abs(estimate - diagonal)
  return a <= b && a <= c ? left : b <= c ? above : diagonal
}

export function pngPixels(bytes: Buffer) {
  const image = png(bytes)
  const channels = { 0: "gray", 2: "rgb", 4: "gray-alpha", 6: "rgba" } as const
  const layout = Object.entries(channels).find(([code]) => Number(code) === image.color)?.[1]
  if (image.depth !== 8 || image.compression || image.filter || image.interlace || image.animated || !layout)
    throw new Error("PNG sample analysis requires a static, non-interlaced 8-bit grayscale or RGB(A) image.")
  if (image.chunks.some((chunk) => !chunk.crcOk && /^(IHDR|IDAT|IEND)$/.test(chunk.type)))
    throw new Error("PNG has an invalid critical chunk CRC.")
  const stride = { gray: 1, rgb: 3, "gray-alpha": 2, rgba: 4 }[layout]
  const row = image.width * stride
  const expected = (row + 1) * image.height
  if (expected > MAX_IMAGE_BYTES) throw new Error("Inflated PNG samples exceed 16 MiB.")
  const data = image.chunks.filter((chunk) => chunk.type === "IDAT")
  if (!data.length) throw new Error("PNG has no IDAT chunks.")
  const pixels = inflateSync(
    Buffer.concat(data.map((part) => bytes.subarray(part.offset + 8, part.offset + 8 + part.size))),
    { maxOutputLength: expected },
  )
  if (pixels.length !== expected) throw new Error("Inflated PNG length does not match IHDR.")
  for (let y = 0; y < image.height; y++) {
    const start = y * (row + 1)
    const filter = pixels[start]
    if (filter > 4) throw new Error("Unsupported PNG row filter.")
    if (filter === 0) continue
    for (let x = 0; x < row; x++) {
      const index = start + x + 1
      const left = x >= stride ? pixels[index - stride] : 0
      const above = y > 0 ? pixels[index - row - 1] : 0
      const diagonal = y > 0 && x >= stride ? pixels[index - row - 1 - stride] : 0
      const delta =
        filter === 1 ? left : filter === 2 ? above : filter === 3 ? (left + above) >>> 1 : paeth(left, above, diagonal)
      pixels[index] += delta
    }
  }
  return {
    ...image,
    layout,
    stride,
    sample(pixel: number, channel: number) {
      const y = Math.floor(pixel / image.width)
      return pixels[y * (row + 1) + 1 + (pixel % image.width) * stride + channel]
    },
  }
}

export function isWave(bytes: Buffer) {
  return bytes.length >= 12 && id(bytes, 0) === "RIFF" && id(bytes, 8) === "WAVE"
}

export function wave(bytes: Buffer) {
  if (!isWave(bytes)) throw new Error("Expected a little-endian RIFF/WAVE file.")
  const end = bytes.readUInt32LE(4) + 8
  if (end < 12 || end > bytes.length) throw new Error("RIFF length exceeds the file or omits the WAVE header.")
  const chunks: Chunk[] = []
  let offset = 12
  while (offset + 8 <= end && chunks.length < MAX_CHUNKS) {
    const size = bytes.readUInt32LE(offset + 4)
    const next = offset + 8 + size + (size % 2)
    if (next > end) throw new Error(`Invalid RIFF chunk length or padding at byte ${offset}.`)
    chunks.push({ type: id(bytes, offset), offset, size })
    offset = next
  }
  if (offset !== end) throw new Error("Incomplete RIFF chunk header or chunk-count limit exceeded.")
  const fmt = chunks.find((chunk) => chunk.type === "fmt ")
  const data = chunks.find((chunk) => chunk.type === "data")
  if (!fmt || fmt.size < 16 || !data) throw new Error("WAVE requires both fmt and data chunks.")
  const start = fmt.offset + 8
  const encoding = bytes.readUInt16LE(start)
  const channels = bytes.readUInt16LE(start + 2)
  const rate = bytes.readUInt32LE(start + 4)
  const align = bytes.readUInt16LE(start + 12)
  const depth = bytes.readUInt16LE(start + 14)
  const supported =
    encoding === 1 &&
    channels >= 1 &&
    channels <= 32 &&
    rate > 0 &&
    [8, 16, 24, 32].includes(depth) &&
    align === channels * (depth / 8) &&
    data.size % align === 0 &&
    chunks.filter((chunk) => chunk.type === "data").length === 1
  return {
    end,
    chunks,
    encoding,
    channels,
    rate,
    depth,
    supported,
    frames: supported ? data.size / align : null,
    sample(frame: number, channel: number) {
      if (!supported) throw new Error("Expected an integer PCM WAV with one aligned data chunk.")
      const offset = data.offset + 8 + frame * align + channel * (depth / 8)
      return depth === 8 ? bytes[offset] - 128 : bytes.readIntLE(offset, depth / 8)
    },
  }
}

function format(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return "png"
  if (isWave(bytes)) return "wav"
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg"
  if (["GIF87a", "GIF89a"].includes(bytes.toString("latin1", 0, 6))) return "gif"
  if (bytes.toString("latin1", 0, 2) === "BM") return "bmp"
  if (id(bytes, 0) === "fLaC") return "flac"
  if (id(bytes, 0) === "OggS") return "ogg"
  if (id(bytes, 0) === "PK\x03\x04" || id(bytes, 0) === "PK\x05\x06") return "zip"
  return "unknown"
}

function pngText(bytes: Buffer, chunk: Chunk) {
  const offset = chunk.offset + 8
  const sample = bytes.subarray(offset, offset + Math.min(320, chunk.size))
  const separator = sample.indexOf(0)
  if (separator < 1 || separator > 79) return { type: chunk.type, offset, invalidKeyword: true }
  const keyword = sample.toString("latin1", 0, separator)
  if (chunk.type === "tEXt")
    return { type: chunk.type, offset, keyword, preview: sample.toString("latin1", separator + 1, separator + 257) }
  if (chunk.type === "zTXt" || sample[separator + 1] === 1)
    return { type: chunk.type, offset, keyword, compressed: true }
  const language = sample.indexOf(0, separator + 3)
  const translated = language < 0 ? -1 : sample.indexOf(0, language + 1)
  return {
    type: chunk.type,
    offset,
    keyword,
    preview: translated < 0 ? undefined : sample.toString("utf8", translated + 1, translated + 257),
  }
}

export function inspect(bytes: Buffer) {
  const kind = format(bytes)
  const base = {
    format: kind,
    size: bytes.length,
    sha256: new Bun.CryptoHasher("sha256").update(bytes).digest("hex"),
    headHex: bytes.subarray(0, 16).toString("hex"),
  }
  const windows = [{ offset: 0, end: Math.min(65536, bytes.length) }]
  if (bytes.length > 65536) windows.push({ offset: Math.max(65536, bytes.length - 65536), end: bytes.length })
  const textHints = windows.flatMap(({ offset, end }) =>
    Array.from(bytes.toString("latin1", offset, end).matchAll(/\b(?:flag|ctf)\{[ -~]{1,96}?\}/gi), (match) => ({
      offset: offset + match.index,
      text: match[0],
    })).slice(0, 8),
  )
  if (kind !== "png" && kind !== "wav") return { ...base, textHints }
  let media: ReturnType<typeof png> | ReturnType<typeof wave>
  try {
    media = kind === "png" ? png(bytes) : wave(bytes)
  } catch (error) {
    return { ...base, textHints, structureError: error instanceof Error ? error.message : String(error) }
  }
  const trailing = bytes.subarray(media.end)
  const textChunks = media.chunks
    .filter((chunk) => ["tEXt", "iTXt", "zTXt"].includes(chunk.type))
    .slice(0, 12)
    .map((chunk) => pngText(bytes, chunk))
  return {
    ...base,
    ...media,
    textHints,
    textChunks,
    crcFailures: media.chunks.flatMap((chunk) => ("crcOk" in chunk && !chunk.crcOk ? [chunk.offset] : [])).slice(0, 80),
    chunks: media.chunks.slice(0, 80),
    chunkCount: media.chunks.length,
    trailing: trailing.length
      ? {
          offset: media.end,
          size: trailing.length,
          signature: format(trailing),
          headHex: trailing.subarray(0, 32).toString("hex"),
        }
      : undefined,
  }
}

import path from "node:path"
import { realpath } from "node:fs/promises"
import z from "zod"
import { Instance } from "../project/instance"
import { BitOptions, bits, ByteOptions, SpectrumOptions } from "../stego/analysis"
import { inspect, localPath, previewBytes, readMedia } from "../stego/media"
import { STEGO_REFERENCES, stegoReference } from "../stego/catalog"
import { spectrumPath, writeSpectrum } from "../stego/output"
import { searchReferences } from "../cryptography/reference"
import { assertExternalDirectory } from "./external-directory"
import { Tool } from "./tool"

const file = z
  .string()
  .min(1)
  .describe("Path to the supplied local artifact, relative to the current project or absolute.")

async function input(name: string, ctx: Tool.Context) {
  const requested = localPath(path.resolve(Instance.directory, name))
  const actual = localPath(await realpath(requested))
  for (const target of new Set([requested, actual])) {
    await assertExternalDirectory(ctx, target)
    await ctx.ask({ permission: "read", patterns: [target], always: [target], metadata: {} })
  }
  return actual
}

export const StegoInspectTool = Tool.define("stego_inspect", {
  description:
    "Triage one supplied local file. Reports a hash, format signature, PNG/WAV structure, uncompressed PNG text and trailing bytes. Does not execute or unpack contents.",
  parameters: z.object({ file }),
  async execute(args, ctx) {
    const target = await input(args.file, ctx)
    const report = inspect(await readMedia(target, ctx.abort))
    return {
      title: path.basename(target),
      output: JSON.stringify(report, null, 2),
      metadata: { format: report.format },
    }
  },
})

export const StegoBitsTool = Tool.define("stego_bits", {
  description:
    "Test a specific sample bit, channel order and offset in a static 8-bit PNG or integer PCM WAV. Returns a short local text/hex preview.",
  parameters: BitOptions.extend({ file }),
  async execute(args, ctx) {
    const { file, ...options } = args
    const target = await input(file, ctx)
    const report = bits(await readMedia(target, ctx.abort), options)
    return {
      title: `Bit ${args.bit}: ${path.basename(target)}`,
      output: JSON.stringify(report, null, 2),
      metadata: { decodedBytes: report.decodedBytes },
    }
  },
})

export const StegoBytesTool = Tool.define("stego_bytes", {
  description:
    "Verify a bounded byte range of a local artifact by zero-based file offset. Returns hex and printable text.",
  parameters: ByteOptions.extend({ file }),
  async execute(args, ctx) {
    const target = await input(args.file, ctx)
    const report = previewBytes(await readMedia(target, ctx.abort), args.offset, args.length)
    return {
      title: `Bytes at ${args.offset}: ${path.basename(target)}`,
      output: JSON.stringify(report, null, 2),
      metadata: {},
    }
  },
})

export const StegoSpectrumTool = Tool.define("stego_spectrum", {
  description:
    "Render a bounded PCM WAV spectrogram. Writes a new PNG for visual inspection. Use an unused output filename in the challenge folder.",
  parameters: SpectrumOptions.extend({
    file,
    output: z.string().min(1).describe("Path to a new .png file in the challenge folder."),
  }),
  async execute(args, ctx) {
    const { file, output, ...options } = args
    const target = await input(file, ctx)
    const requested = path.resolve(Instance.directory, output)
    const resolved = await spectrumPath(requested)
    await assertExternalDirectory(ctx, requested)
    await assertExternalDirectory(ctx, resolved)
    await ctx.ask({ permission: "stego_spectrum", patterns: [resolved], always: [], metadata: { output: resolved } })
    const report = await writeSpectrum(target, resolved, options, ctx.abort)
    return { title: path.basename(resolved), output: JSON.stringify(report, null, 2), metadata: { output: resolved } }
  },
})

export const StegoReferenceTool = Tool.define("stego_reference", {
  description:
    "List, keyword-search or read local steganography methodology. Topics cover triage, PNG sample planes, WAV spectra and verification.",
  parameters: z.object({
    action: z.enum(["list", "search", "read"]).default("list"),
    topic: z.enum(STEGO_REFERENCES).optional(),
    query: z.string().min(1).max(200).optional(),
  }),
  async execute(args) {
    if (args.action === "list")
      return { title: "Stego reference topics", output: STEGO_REFERENCES.join("\n"), metadata: {} }
    if (args.action === "read") {
      if (!args.topic) throw new Error("Choose a reference topic.")
      const output = await Bun.file(await stegoReference(args.topic + ".md")).text()
      return { title: args.topic, output, metadata: {} }
    }
    if (!args.query) throw new Error("Enter a search query.")
    const topics = args.topic ? [args.topic] : STEGO_REFERENCES
    const docs = await Promise.all(
      topics.map(async (topic) => ({
        topic,
        text: await Bun.file(await stegoReference(topic + ".md")).text(),
      })),
    )
    return {
      title: "Stego reference matches",
      output: JSON.stringify(searchReferences(docs, args.query, 5), null, 2),
      metadata: {},
    }
  },
})

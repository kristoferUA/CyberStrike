import path from "node:path"
import { cmd } from "./cmd"
import { BitOptions, bits, ByteOptions, SpectrumOptions } from "../../stego/analysis"
import { MAX_FILE_BYTES, inspect, previewBytes, readMedia } from "../../stego/media"
import { STEGO_REFERENCES } from "../../stego/catalog"
import { spectrumPath, writeSpectrum } from "../../stego/output"

const show = (value: unknown) => console.log(JSON.stringify(value, null, 2))

export const StegoCommand = cmd({
  command: "stego",
  describe: "inspect local CTF images and audio without dependencies or a model request",
  builder: (yargs) =>
    yargs
      .command(
        cmd({
          command: "status",
          describe: "list built-in stego capabilities",
          handler: () =>
            show({
              backend: "built-in",
              network: false,
              maxInputBytes: MAX_FILE_BYTES,
              references: STEGO_REFERENCES,
              inspect: ["PNG", "RIFF/WAVE", "other formats by signature"],
              bits: ["non-interlaced 8-bit grayscale/RGB(A) PNG", "integer PCM WAV"],
              spectrum: ["integer PCM WAV"],
            }),
        }),
      )
      .command(
        cmd({
          command: "inspect <file>",
          describe: "report format signature, hash, PNG/WAV chunks, and trailing-byte clues",
          builder: (args) => args.positional("file", { type: "string", demandOption: true }),
          handler: async (args) => show(inspect(await readMedia(args.file))),
        }),
      )
      .command(
        cmd({
          command: "bytes <file>",
          describe: "preview exact local bytes in hex and printable text",
          builder: (args) =>
            args
              .positional("file", { type: "string", demandOption: true })
              .option("offset", { type: "number", describe: "Zero-based file offset" })
              .option("length", { type: "number", describe: "Byte count, 1–512; default 64" }),
          handler: async (args) => {
            const { offset, length } = ByteOptions.parse(args)
            show(previewBytes(await readMedia(args.file), offset, length))
          },
        }),
      )
      .command(
        cmd({
          command: "bits <file>",
          describe: "read one sample bit from a PNG or WAV and show decoded text and hex",
          builder: (args) =>
            args
              .positional("file", { type: "string", demandOption: true })
              .option("channels", {
                type: "string",
                describe: "PNG channels, WAV zero-based channel index, or WAV all",
              })
              .option("bit", { type: "number", describe: "Sample bit 0–7, default 0" })
              .option("order", { choices: ["msb", "lsb"], describe: "Output byte packing, default msb" })
              .option("offset", { type: "number", describe: "Starting pixel or audio frame, default 0" })
              .option("bytes", { type: "number", describe: "Number of decoded bytes to preview, default 128" }),
          handler: async (args) => {
            const options = BitOptions.parse(args)
            show(bits(await readMedia(args.file), options))
          },
        }),
      )
      .command(
        cmd({
          command: "spectrum <file>",
          describe: "write a PCM WAV spectrogram to a new PNG file",
          builder: (args) =>
            args
              .positional("file", { type: "string", demandOption: true })
              .option("out", {
                type: "string",
                demandOption: true,
                describe: "Path to a new PNG in an existing directory",
              })
              .option("channel", { type: "number", describe: "Zero-based WAV channel, default 0" })
              .option("columns", { type: "number", describe: "Time columns, default 256" })
              .option("fft", { type: "number", describe: "FFT size: 256, 512, 1024, or 2048. Default 512." })
              .option("start", { type: "number", describe: "Start time in seconds" })
              .option("duration", { type: "number", describe: "Seconds to display" }),
          handler: async (args) => {
            const options = SpectrumOptions.parse(args)
            const output = await spectrumPath(path.resolve(args.out))
            show(await writeSpectrum(args.file, output, options))
          },
        }),
      )
      .demandCommand(1),
  handler() {},
})

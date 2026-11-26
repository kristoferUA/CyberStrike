import path from "node:path"
import { realpath, writeFile } from "node:fs/promises"
import { spectrum, type SpectrumOptions } from "./analysis"
import { localPath, readMedia } from "./media"
import type z from "zod"

export async function spectrumPath(name: string) {
  name = localPath(name)
  if (path.extname(name).toLowerCase() !== ".png") throw new Error("Use a new .png file for the spectrogram.")
  if (process.platform === "win32" && path.basename(name).includes(":")) throw new Error("Use a plain PNG filename.")
  return localPath(path.join(await realpath(path.dirname(name)), path.basename(name)))
}

export async function writeSpectrum(
  file: string,
  output: string,
  options: z.infer<typeof SpectrumOptions>,
  signal?: AbortSignal,
) {
  const result = spectrum(await readMedia(file, signal), options)
  signal?.throwIfAborted()
  await writeFile(output, result.image, { flag: "wx", signal })
  return { output, ...result.metadata }
}

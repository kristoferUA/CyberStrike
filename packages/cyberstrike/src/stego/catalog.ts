import path from "node:path"

export const STEGO_SKILLS = ["ctf-stego"]
export const STEGO_REFERENCES = ["triage", "png", "wav", "verification"] as const

export async function stegoReference(name: string) {
  if (!STEGO_REFERENCES.some((topic) => topic + ".md" === name)) throw new Error("Unknown stego reference.")
  const relative = path.join("stego", "ctf-stego", "references", name)
  for (const root of [
    path.join(path.dirname(process.execPath), "skills"),
    path.resolve(import.meta.dir, "../../../../.cyberstrike/skill"),
  ]) {
    const file = path.join(root, relative)
    if (await Bun.file(file).exists()) return file
  }
  throw new Error("Stego references are missing. Rebuild or reinstall the complete CyberStrike package.")
}

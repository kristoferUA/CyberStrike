import z from "zod"
import { Lock } from "../util/lock"

export const SAGECELL_URL = "https://sagecell.sagemath.org/service"
const Result = z.object({
  success: z.boolean(),
  stdout: z.string().optional().default(""),
  stderr: z.string().optional().default(""),
  execute_reply: z
    .object({
      status: z.string().optional(),
      ename: z.string().optional(),
      evalue: z.string().optional(),
      traceback: z.array(z.string()).optional(),
    })
    .optional(),
})

export async function sagecell(code: string, signal?: AbortSignal) {
  if (!code.trim()) throw new Error("Sage code is empty.")
  const payload = [
    "from sage.all import *",
    "from sage.repl.preparse import preparse as _ctf_preparse",
    "import base64 as _ctf_base64",
    `exec(compile(_ctf_preparse(_ctf_base64.b64decode('${Buffer.from(code, "utf8").toString("base64")}').decode('utf8')), '<cyberstrike-ctf>', 'exec'))`,
  ].join("\n")
  if (payload.length > 65000)
    throw new Error("SageCell accepts at most 65000 characters per request. Reduce the self-contained Sage input.")
  using _ = await Lock.write("cryptography-sagecell")
  signal?.throwIfAborted()
  const response = await fetch(SAGECELL_URL, {
    method: "POST",
    redirect: "error",
    credentials: "omit",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ code: payload }),
    signal: AbortSignal.any([AbortSignal.timeout(45000), ...(signal ? [signal] : [])]),
  })
  if (!response.ok) {
    await response.body?.cancel()
    if (response.status === 403)
      throw new Error(
        "SageCell refused the request. It may require acceptance of its terms; CyberStrike does not accept terms automatically. See https://sagecell.sagemath.org/tos.html.",
      )
    throw new Error(
      `SageCell returned HTTP ${response.status}. No automatic retry was made. Respect service limits and try later if it is busy.`,
    )
  }
  const reader = response.body?.getReader()
  if (!reader) throw new Error("SageCell returned no response body.")
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    while (true) {
      const item = await reader.read()
      if (item.done) break
      bytes += item.value.byteLength
      if (bytes > 1048576) {
        await reader.cancel()
        throw new Error("SageCell output exceeds 1 MiB. Print a smaller result.")
      }
      chunks.push(item.value)
    }
  } finally {
    reader.releaseLock()
  }
  const result = Result.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")))
  return {
    ...result,
    endpoint: SAGECELL_URL,
    codeSha256: new Bun.CryptoHasher("sha256").update(code).digest("hex"),
    note: "Remote stateless computation. The service currently limits /service jobs to 30 seconds. Use print() for results; local files and network oracle connections are not available here.",
  }
}

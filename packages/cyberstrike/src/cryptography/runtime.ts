import path from "node:path"
import os from "node:os"
import fs from "node:fs/promises"
import z from "zod"
import { Global } from "../global"
import { Lock } from "../util/lock"

export namespace CryptoRuntime {
  const Inventory = z.object({
    python: z.string(),
    version: z.string(),
    packages: z.record(z.string(), z.string().nullable()),
    ready: z.boolean(),
  })
  export const home = path.join(Global.Path.data, "cryptography")
  export const environment = path.join(home, "venv")
  export const python = path.join(environment, process.platform === "win32" ? "Scripts/python.exe" : "bin/python")

  export async function resource(name: string) {
    const roots = [
      path.join(path.dirname(process.execPath), "crypto"),
      path.resolve(import.meta.dir, "../../../../tools/cryptography"),
    ]
    for (const root of roots) {
      const file = path.join(root, name)
      if (await Bun.file(file).exists()) return file
    }
    throw new Error(`Cryptography resource ${name} is missing. Rebuild this fork with script/build-windows.ps1.`)
  }

  export function uv() {
    const executable =
      Bun.which("uv") ?? path.join(os.homedir(), ".local", "bin", process.platform === "win32" ? "uv.exe" : "uv")
    return executable
  }

  export async function reference(name: string) {
    if (!/^[a-z0-9-]+\.md$/.test(name)) throw new Error("Invalid cryptography reference name.")
    const roots = [
      path.join(path.dirname(process.execPath), "skills", "cryptography", "ctf-crypto", "references"),
      path.resolve(import.meta.dir, "../../../../.cyberstrike/skill/cryptography/ctf-crypto/references"),
      path.join(Global.Path.data, "skill", "cryptography", "ctf-crypto", "references"),
    ]
    for (const root of roots) {
      const file = path.join(root, name)
      if (await Bun.file(file).exists()) return file
    }
    throw new Error(`Cryptography reference ${name} is missing. Rebuild or reinstall the fork's skill resources.`)
  }

  export async function execute(
    program: "python" | "probe" | "math" | "openssl" | "hashcat" | "john",
    args: string[],
    options: { cwd: string; signal?: AbortSignal; timeout?: number; stdin?: string },
  ) {
    if (["python", "probe", "math"].includes(program)) {
      if (!(await Bun.file(python).exists()))
        throw new Error("Run cyberstrike crypto setup to install the managed Python environment.")
      return run([python, ...(program === "python" ? [] : [await resource(program + ".py")]), ...args], options)
    }
    const executable = Bun.which(program)
    if (!executable)
      throw new Error(
        `${program} is optional and is not on PATH. See docs/cryptography.uk.md for installation sources.`,
      )
    return run([executable, ...args], options)
  }

  async function collect(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let output = ""
    let truncated = false
    try {
      while (true) {
        const next = await reader.read()
        if (next.done) break
        if (output.length >= 262144) {
          truncated = true
          continue
        }
        const text = decoder.decode(next.value, { stream: true })
        truncated ||= output.length + text.length > 262144
        output = (output + text).slice(0, 262144)
      }
      return output + (truncated ? "\n[Output truncated; redirect large output to a local file.]" : "")
    } finally {
      reader.releaseLock()
    }
  }

  export async function run(
    argv: string[],
    options: {
      cwd?: string
      signal?: AbortSignal
      timeout?: number
      stdin?: string
      env?: Record<string, string>
    } = {},
  ) {
    options.signal?.throwIfAborted()
    const proc = Bun.spawn(argv, {
      cwd: options.cwd,
      stdout: "pipe",
      stderr: "pipe",
      stdin: options.stdin === undefined ? "ignore" : new TextEncoder().encode(options.stdin),
      timeout: options.timeout ?? 120000,
      env: { ...process.env, ...options.env, PYTHONDONTWRITEBYTECODE: "1", PYTHONUNBUFFERED: "1", PYTHONUTF8: "1" },
    })
    const abort = () => proc.kill()
    options.signal?.addEventListener("abort", abort, { once: true })
    if (options.signal?.aborted) abort()
    try {
      const [stdout, stderr, exitCode] = await Promise.all([collect(proc.stdout), collect(proc.stderr), proc.exited])
      options.signal?.throwIfAborted()
      return { stdout, stderr, exitCode }
    } finally {
      options.signal?.removeEventListener("abort", abort)
    }
  }

  export async function status(signal?: AbortSignal) {
    const installed = await Bun.file(python).exists()
    const result = installed
      ? await run([python, "-I", await resource("status.py")], { signal, timeout: 15000 })
      : undefined
    const details = result?.exitCode === 0 ? Inventory.parse(JSON.parse(result.stdout)) : undefined
    return {
      environment,
      installed,
      ready: details?.ready === true,
      ...details,
      lockMatches:
        installed &&
        (await Bun.file(path.join(home, "lock.sha256"))
          .text()
          .catch(() => "")) ===
          new Bun.CryptoHasher("sha256")
            .update((await Bun.file(await resource("requirements.lock")).text()).replace(/\r\n/g, "\n"))
            .digest("hex"),
      uv: (await Bun.file(uv()).exists()) ? uv() : null,
      sage: {
        backend: "SageCell HTTPS API",
        endpoint: "https://sagecell.sagemath.org/service",
        localInstallRequired: false,
      },
      optional: { openssl: Bun.which("openssl"), hashcat: Bun.which("hashcat"), john: Bun.which("john") },
      error: result && result.exitCode !== 0 ? result.stderr : undefined,
    }
  }

  export async function setup(signal?: AbortSignal) {
    using _ = await Lock.write("cryptography-environment")
    if (!(await Bun.file(uv()).exists()))
      throw new Error(
        "uv is required. Install it from https://docs.astral.sh/uv/getting-started/installation/ and restart the terminal.",
      )
    await fs.mkdir(home, { recursive: true })
    if (!(await Bun.file(python).exists())) {
      const created = await run([uv(), "venv", "--managed-python", "--python", "3.12", environment], {
        signal,
        timeout: 300000,
        env: { UV_PYTHON_INSTALL_DIR: path.join(home, "python") },
      })
      if (created.exitCode !== 0) throw new Error(`Could not create the managed crypto environment: ${created.stderr}`)
    }
    const lock = await resource("requirements.lock")
    const result = await run(
      [uv(), "pip", "sync", "--python", python, "--require-hashes", "--only-binary", ":all:", lock],
      { signal, timeout: 600000 },
    )
    if (result.exitCode !== 0) throw new Error(`Crypto package installation failed: ${result.stderr}`)
    await Bun.write(
      path.join(home, "lock.sha256"),
      new Bun.CryptoHasher("sha256").update((await Bun.file(lock).text()).replace(/\r\n/g, "\n")).digest("hex"),
    )
    return status(signal)
  }
}

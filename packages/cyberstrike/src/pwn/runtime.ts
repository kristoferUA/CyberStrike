import path from "node:path"
import { CryptoRuntime } from "../cryptography/runtime"
import { Config } from "../config/config"
import { PwnSettings } from "./schema"

export namespace PwnRuntime {
  export const COMMANDS = [
    "python",
    "inspect",
    "binary",
    "qemu",
    "gdb",
    "file",
    "readelf",
    "objdump",
    "nm",
    "strings",
    "strace",
    "ltrace",
    "patchelf",
    "checksec",
    "cyclic",
    "ROPgadget",
    "ropper",
  ] as const
  export const ARCHES = ["amd64", "i386", "aarch64", "arm", "mips", "mipsel", "riscv64", "ppc"] as const
  export type Request = {
    command: (typeof COMMANDS)[number] | "debug" | "status"
    file?: string
    args?: string[]
    gdb_script?: string
    sysroot?: string
    arch?: (typeof ARCHES)[number]
    stdin?: string
    stdin_file?: string
    timeout?: number
  }

  export async function settings() {
    return PwnSettings.parse((await Config.get()).pwn ?? {})
  }

  export async function resource(name: string) {
    if (!/^[a-z0-9.-]+$/.test(name)) throw new Error("Invalid pwn resource name")
    for (const root of [
      path.join(path.dirname(process.execPath), "pwn"),
      path.resolve(import.meta.dir, "../../../../tools/pwn"),
    ]) {
      const file = path.join(root, name)
      if (await Bun.file(file).exists()) return file
    }
    throw new Error("Pwn resources are missing. Rebuild the complete fork, including its bin/pwn directory.")
  }

  export async function reference(name: string) {
    if (!/^[a-z0-9-]+\.md$/.test(name)) throw new Error("Invalid pwn reference name")
    for (const root of [
      path.join(path.dirname(process.execPath), "skills/pwn/ctf-pwn/references"),
      path.resolve(import.meta.dir, "../../../../.cyberstrike/skill/pwn/ctf-pwn/references"),
    ]) {
      const file = path.join(root, name)
      if (await Bun.file(file).exists()) return file
    }
    throw new Error("Pwn reference is missing. Rebuild the fork's skill resources.")
  }

  async function prefix(distribution?: string) {
    if (process.platform !== "win32") return []
    const name = distribution ?? (await settings()).distribution
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(name)) throw new Error("Invalid WSL distribution name")
    if (!Bun.which("wsl.exe")) throw new Error("WSL is missing. Run script/setup-pwn-windows.ps1; see docs/pwn.uk.md.")
    return ["wsl.exe", "--distribution", name, "--exec"]
  }

  export async function linux(file: string, distribution?: string) {
    if (process.platform !== "win32" || file.startsWith("/")) return file
    const result = await CryptoRuntime.run(
      [...(await prefix(distribution)), "wslpath", "-a", "-u", path.resolve(file)],
      { timeout: 15000 },
    )
    if (result.exitCode !== 0)
      throw new Error("Cannot map path into WSL. Initialize Ubuntu first; see docs/pwn.uk.md.\n" + result.stderr)
    return result.stdout.trim()
  }

  export async function execute(
    request: Request,
    options: { cwd: string; signal?: AbortSignal; distribution?: string },
  ) {
    const translated = { ...request, cwd: await linux(options.cwd, options.distribution) }
    for (const field of ["file", "gdb_script", "sysroot", "stdin_file"] as const) {
      if (request[field]) translated[field] = await linux(request[field]!, options.distribution)
    }
    const result = await CryptoRuntime.run(
      [
        ...(await prefix(options.distribution)),
        "python3",
        "-B",
        await linux(await resource("backend.py"), options.distribution),
        JSON.stringify(translated),
      ],
      {
        signal: options.signal,
        timeout: ((request.timeout ?? 30) + 20) * 1000,
      },
    )
    if (result.exitCode !== 0)
      throw new Error(
        "Pwn backend failed. Run cyberstrike pwn status/setup or script/setup-pwn-windows.ps1.\n" +
          result.stderr +
          result.stdout,
      )
    return JSON.parse(result.stdout) as {
      exitCode?: number
      stdout?: string
      stderr?: string
      timedOut?: boolean
      artifacts?: string
      qemuStdout?: string
      qemuStderr?: string
      transport?: string
      environment?: string
      python?: string
      ready?: boolean
      lockMatches?: boolean
      packages?: Record<string, string>
      tools?: Record<string, string | null>
    }
  }

  export async function status(options: { cwd: string; signal?: AbortSignal; distribution?: string }) {
    return execute({ command: "status" }, options).catch((error: Error) => ({
      ready: false,
      error: error.message,
      instruction: "Run script/setup-pwn-windows.ps1 on Windows, or cyberstrike pwn setup in Ubuntu.",
    }))
  }

  export async function setup(options: { cwd: string; signal?: AbortSignal; distribution?: string }) {
    const common = await prefix(options.distribution)
    const script = await linux(await resource("system.sh"), options.distribution)
    const dependencies = await CryptoRuntime.run(
      process.platform === "win32"
        ? [
            "wsl.exe",
            "--distribution",
            options.distribution ?? (await settings()).distribution,
            "--user",
            "root",
            "--exec",
            "/bin/sh",
            script,
          ]
        : ["sudo", "-n", "/bin/sh", script],
      { signal: options.signal, timeout: 900000 },
    )
    if (dependencies.exitCode !== 0)
      throw new Error(
        "Pwn system dependencies failed. Initialize Ubuntu and retry, or install system.sh with sudo.\n" +
          dependencies.stderr +
          dependencies.stdout,
      )
    const environment = await CryptoRuntime.run(
      [...common, "/bin/sh", await linux(await resource("setup.sh"), options.distribution)],
      { signal: options.signal, timeout: 900000 },
    )
    if (environment.exitCode !== 0)
      throw new Error("Pwn Python environment failed.\n" + environment.stderr + environment.stdout)
    return status(options)
  }
}

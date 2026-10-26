import z from "zod"
import path from "node:path"
import { Tool } from "./tool"
import { Instance } from "../project/instance"
import { PwnRuntime } from "../pwn/runtime"

async function local(file: string, ctx: Tool.Context) {
  const resolved = path.resolve(Instance.directory, file)
  if (!Instance.containsPath(resolved))
    await ctx.ask({
      permission: "external_directory",
      patterns: [resolved],
      always: [path.dirname(resolved)],
      metadata: {},
    })
  await ctx.ask({ permission: "read", patterns: [resolved], always: [resolved], metadata: {} })
  if (!(await Bun.file(resolved).exists())) throw new Error(`Pwn input file does not exist: ${resolved}`)
  return resolved
}

export const PwnEnvironmentTool = Tool.define("pwn_environment", {
  description:
    "Inspect the WSL2/Ubuntu pwn environment or install its system tools and isolated hash-locked Python 3.12 venv. Includes QEMU user/system, gdb-multiarch, binutils, pwntools, ROPgadget, ropper, Capstone and Unicorn. Install only on an explicit setup/tool-installation request. Missing WSL/Ubuntu requires script/setup-pwn-windows.ps1; do not change the default distribution.",
  parameters: z.object({ action: z.enum(["status", "install"]).default("status") }),
  async execute(args, ctx) {
    if (args.action === "install")
      await ctx.ask({
        permission: "pwn_install",
        patterns: ["Ubuntu pwn toolchain"],
        always: ["Ubuntu pwn toolchain"],
        metadata: {},
      })
    const options = { cwd: Instance.directory, signal: ctx.abort }
    const result = args.action === "install" ? await PwnRuntime.setup(options) : await PwnRuntime.status(options)
    return {
      title: result.ready ? "Pwn environment ready" : "Pwn environment needs setup",
      output: JSON.stringify(result, null, 2),
      metadata: result,
    }
  },
})

const Execution = {
  file: z
    .string()
    .optional()
    .describe(
      "Reviewed local file: exploit.py for Python, ELF for binary/QEMU/GDB/inspect, or input file for binutils",
    ),
  args: z.array(z.string().max(2048)).max(100).default([]),
  arch: z.enum(PwnRuntime.ARCHES).optional().describe("ELF architecture; omitted means inspect the ELF machine header"),
  sysroot: z
    .string()
    .optional()
    .describe("Matching Linux sysroot, e.g. /usr/aarch64-linux-gnu; not a guessed host libc"),
  gdb_script: z
    .string()
    .optional()
    .describe("Reviewed local GDB command file, required for standalone gdb; optional for QEMU entry inspection"),
  stdin_file: z.string().optional().describe("Local file containing exact binary input bytes"),
  purpose: z.enum(["experiment", "solve", "verify"]).default("experiment"),
  timeout_seconds: z.number().int().min(1).max(300).optional(),
  justification: z.string().min(12).max(500).optional(),
}

async function execute(
  args: z.infer<z.ZodObject<typeof Execution>> & { program?: (typeof PwnRuntime.COMMANDS)[number] },
  ctx: Tool.Context,
  debug = false,
) {
  const settings = await PwnRuntime.settings()
  const budget = args.purpose === "experiment" ? settings.experiment_timeout_seconds : settings.solver_timeout_seconds
  const timeout = args.timeout_seconds ?? budget
  if (timeout > budget && !args.justification)
    throw new Error(
      `The ${args.purpose} budget is ${budget}s. A longer run requires measured progress or a concrete work estimate.`,
    )
  const command = debug ? "debug" : (args.program ?? "python")
  if (["python", "inspect", "binary", "qemu", "gdb", "debug"].includes(command) && !args.file)
    throw new Error(`${command} requires a reviewed local file path.`)
  if (command === "python" && !args.file?.endsWith(".py"))
    throw new Error("Python requires a saved .py FILE PATH, never inline code.")
  const file = args.file ? await local(args.file, ctx) : undefined
  const gdb_script = args.gdb_script ? await local(args.gdb_script, ctx) : undefined
  const stdin_file = args.stdin_file ? await local(args.stdin_file, ctx) : undefined
  await ctx.ask({
    permission: debug ? "pwn_debug" : "pwn_run",
    patterns: [command],
    always: [command],
    metadata: { file, arch: args.arch },
  })
  const result = await PwnRuntime.execute(
    { command, file, gdb_script, stdin_file, args: args.args, sysroot: args.sysroot, arch: args.arch, timeout },
    { cwd: Instance.directory, signal: ctx.abort },
  )
  if (result.exitCode !== 0 || result.timedOut)
    throw new Error(
      `Pwn ${command} exited ${result.exitCode}; timedOut=${result.timedOut}. A timeout or crash alone is not a solved challenge.\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    )
  return {
    title: debug ? "QEMU + GDB evidence" : `Pwn ${command}`,
    output: JSON.stringify(result, null, 2),
    metadata: result,
  }
}

export const PwnRunTool = Tool.define("pwn_run", {
  description:
    'Run a reviewed local CTF solver or binary analysis tool in Ubuntu/WSL. Example: {"program":"python","file":"exploit.py","args":[]}. Use inspect for static ELF triage (no execution/ldd), qemu for foreign ELF, gdb with a saved reviewed gdb_script. Other programs include readelf/objdump/strings/checksec/ROPgadget/ropper/cyclic. Exact binary input uses stdin_file. This is not a sandbox; only supplied authorized CTF/lab targets. Default experiments 30s, established solve/verify 120s; preserve results between runs.',
  parameters: z.object({ program: z.enum(PwnRuntime.COMMANDS).default("python"), ...Execution }),
  execute: (args, ctx) => execute(args, ctx),
})

export const PwnDebugTool = Tool.define("pwn_debug", {
  description:
    'Launch the supplied ELF with QEMU user-mode and attach batch gdb-multiarch. Without gdb_script, inspect entry registers/instructions/backtrace. With a reviewed local GDB file, run its commands. Example: {"file":"challenge","arch":"aarch64","sysroot":"/usr/aarch64-linux-gnu","gdb_script":"trace.gdb"}. The debugger uses a private Unix socket (or isolated namespace for old QEMU); its own QEMU process is cleaned up. Save logs as evidence. Not a PE or kernel-VM debugger; no external target connection is inferred.',
  parameters: z.object(Execution),
  execute: (args, ctx) => execute(args, ctx, true),
})

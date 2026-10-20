import z from "zod"
import path from "node:path"
import { Tool } from "./tool"
import { Instance } from "../project/instance"
import { Session } from "../session"
import { CryptoRuntime } from "../cryptography/runtime"
import { CryptoMethodology } from "../cryptography/methodology"
import { CRYPTO_PHASES, CRYPTO_REFERENCES } from "../cryptography/catalog"
import { sagecell, SAGECELL_URL } from "../cryptography/sagecell"

async function local(filename: string, ctx: Tool.Context) {
  const file = path.resolve(Instance.directory, filename)
  if (!Instance.containsPath(file))
    await ctx.ask({ permission: "external_directory", patterns: [file], always: [path.dirname(file)], metadata: {} })
  await ctx.ask({ permission: "read", patterns: [file], always: [file], metadata: {} })
  return file
}

export const CryptoEnvironmentTool = Tool.define("crypto_environment", {
  description:
    "Inspect or install the isolated Python 3.12 cryptography environment. Install only when the user requests setup/tool installation. Packages are pinned with hashes; Sage uses the SageCell API, not a local Sage installation. Status includes optional system OpenSSL, Hashcat and John availability.",
  parameters: z.object({ action: z.enum(["status", "install"]).default("status") }),
  async execute(args, ctx) {
    if (args.action === "install")
      await ctx.ask({
        permission: "crypto_install",
        patterns: [CryptoRuntime.environment],
        always: [CryptoRuntime.environment],
        metadata: {},
      })
    const result =
      args.action === "install" ? await CryptoRuntime.setup(ctx.abort) : await CryptoRuntime.status(ctx.abort)
    return {
      title: result.ready ? "Cryptography environment ready" : "Cryptography environment needs setup",
      output: JSON.stringify(result, null, 2),
      metadata: result,
    }
  },
})

export const CryptoRunTool = Tool.define("crypto_run", {
  description:
    "Run a reviewed local CTF solver with the managed crypto Python, or a bundled probe/math helper. Optional system programs: openssl, hashcat, john. Pass argv entries, never a shell command string. Python requires script; probe args start with a file; math args start with gcd/inverse/root/crt/rsa/xor. Timeout and cancellation are bounded. This virtual environment is not a sandbox. Network operations must stay within challenge scope and query limits.",
  parameters: z.object({
    program: z.enum(["python", "probe", "math", "openssl", "hashcat", "john"]).default("python"),
    script: z.string().optional(),
    args: z.array(z.string()).max(100).default([]),
    stdin: z.string().max(1048576).optional(),
    timeout_seconds: z.number().int().min(1).max(300).default(120),
  }),
  async execute(args, ctx) {
    await ctx.ask({ permission: "crypto_run", patterns: [args.program], always: [args.program], metadata: {} })
    const argv = [...args.args]
    if (args.program === "python") {
      if (!args.script || !/\.py$/i.test(args.script))
        throw new Error(
          "Python solvers must name a reviewed .py script; inline interpreter options are not accepted as scripts.",
        )
      argv.unshift(await local(args.script, ctx))
    }
    if (args.program === "probe") {
      if (!argv[0] || argv[0].startsWith("-")) throw new Error("The first probe argument must be a local file.")
      argv[0] = await local(argv[0], ctx)
    }
    const result = await CryptoRuntime.execute(args.program, argv, {
      cwd: Instance.directory,
      signal: ctx.abort,
      timeout: args.timeout_seconds * 1000,
      stdin: args.stdin,
    })
    if (result.exitCode !== 0)
      throw new Error(`${args.program} exited ${result.exitCode}\n${result.stdout}\n${result.stderr}`)
    return {
      title: `Crypto ${args.program}`,
      output: result.stdout + (result.stderr ? "\n[stderr]\n" + result.stderr : ""),
      metadata: { program: args.program, exitCode: result.exitCode },
    }
  },
})

export const CryptoSageTool = Tool.define("crypto_sage", {
  description:
    "Execute self-contained Sage code at https://sagecell.sagemath.org/service. This sends the supplied code and embedded values to the public remote service. Use for public CTF mathematical parameters, not unrelated secrets or recovered private keys/flags. Provide code OR a local .sage file. Each call is stateless, currently capped at 30 seconds, and cannot access local files or network oracles. Use print() to return small results; do not install packages, create permalinks or retry automatically on overload. No local Sage, Docker, API key or Python environment is required.",
  parameters: z.object({ code: z.string().max(45000).optional(), file: z.string().optional() }),
  async execute(args, ctx) {
    if ((args.code === undefined) === (args.file === undefined)) throw new Error("Provide exactly one of code or file.")
    await ctx.ask({
      permission: "crypto_sage",
      patterns: [SAGECELL_URL],
      always: [SAGECELL_URL],
      metadata: { remote: true },
    })
    const file = args.file ? Bun.file(await local(args.file, ctx)) : undefined
    if (file && file.size > 45000) throw new Error("Sage input exceeds 45000 bytes.")
    const result = await sagecell(file ? await file.text() : args.code!, ctx.abort)
    if (!result.success)
      throw new Error(`SageCell computation failed or exceeded its server limit:\n${JSON.stringify(result, null, 2)}`)
    return {
      title: "SageCell result",
      output: JSON.stringify(result, null, 2),
      metadata: { success: result.success, codeSha256: result.codeSha256, endpoint: result.endpoint },
    }
  },
})

export const CryptoReferenceTool = Tool.define("crypto_reference", {
  description:
    "List, search or read the version-pinned MIT-licensed ljagiello/ctf-skills crypto reference library. Read only matching topics/sections. Snippets are reference material, not verified solvers; check mathematical preconditions and adapt Sage snippets to the stateless SageCell service. The upstream installer is not used.",
  parameters: z.object({
    action: z.enum(["list", "read", "search"]).default("list"),
    topic: z.enum(CRYPTO_REFERENCES).optional(),
    query: z.string().min(2).max(200).optional(),
    start_line: z.number().int().min(1).default(1),
    lines: z.number().int().min(1).max(400).default(160),
  }),
  async execute(args) {
    if (args.action === "list")
      return {
        title: "Crypto reference topics",
        output: CRYPTO_REFERENCES.join("\n"),
        metadata: {
          topics: [...CRYPTO_REFERENCES],
          source: "ljagiello/ctf-skills",
          commit: "1fdf188cb7ac84a0a2697851aecab156f283e56b",
        },
      }
    const topics = args.topic ? [args.topic] : [...CRYPTO_REFERENCES]
    if (args.action === "read" && !args.topic) throw new Error("Choose a reference topic to read.")
    if (args.action === "search" && !args.query) throw new Error("A search query is required.")
    const sections: string[] = []
    for (const topic of topics) {
      const lines = (await Bun.file(await CryptoRuntime.reference(topic + ".md")).text()).split(/\r?\n/)
      if (args.action === "read") {
        sections.push(
          `# ${topic}: lines ${args.start_line}-${Math.min(lines.length, args.start_line + args.lines - 1)} of ${lines.length}`,
          ...lines
            .slice(args.start_line - 1, args.start_line - 1 + args.lines)
            .map((line, i) => `${i + args.start_line}: ${line}`),
        )
      } else {
        lines.forEach((line, i) => {
          if (sections.length < 100 && line.toLowerCase().includes(args.query!.toLowerCase()))
            sections.push(`${topic}:${i + 1}: ${line.slice(0, 500)}`)
        })
      }
    }
    return {
      title: `Crypto reference ${args.action}`,
      output: sections.join("\n") || "No matching sections.",
      metadata: { topics, source: "ljagiello/ctf-skills", commit: "1fdf188cb7ac84a0a2697851aecab156f283e56b" },
    }
  },
})

export const CryptoMethodologyTool = Tool.define("crypto_methodology", {
  description:
    "Track the CTF cryptography workflow: intake, classification, model, attack, recovery, verification, writeup. Record evidence and SHA-256 hashes of local artifacts. Preceding phases must be completed before advancing; verification completion needs an evidence artifact. This records claims and provenance, not an automatic certificate of mathematical correctness. Earlier changes invalidate later completions. Do not use web reconnaissance/VRT phases for local crypto tasks.",
  parameters: z.object({
    action: z.enum(["status", "record"]).default("status"),
    phase: z
      .enum(
        CRYPTO_PHASES.map((phase) => phase.id) as [
          (typeof CRYPTO_PHASES)[number]["id"],
          ...(typeof CRYPTO_PHASES)[number]["id"][],
        ],
      )
      .optional(),
    status: z.enum(["in_progress", "blocked", "completed"]).optional(),
    evidence: z.string().min(12).max(12000).optional(),
    artifacts: z.array(z.string()).max(10).default([]),
  }),
  async execute(args, ctx) {
    const sessionID = Session.root(ctx.sessionID)
    if (args.action === "record" && (!args.phase || !args.status || !args.evidence))
      throw new Error("Recording needs phase, status and evidence.")
    const state =
      args.action === "record"
        ? await CryptoMethodology.record({
            sessionID,
            phase: args.phase!,
            status: args.status!,
            evidence: args.evidence!,
            artifacts: await Promise.all(args.artifacts.map((file) => local(file, ctx))),
            signal: ctx.abort,
          })
        : await CryptoMethodology.read(sessionID)
    return {
      title: `Cryptography: ${state.completed}/${state.total} phases`,
      output: JSON.stringify(state, null, 2),
      metadata: { cryptography: state },
    }
  },
})

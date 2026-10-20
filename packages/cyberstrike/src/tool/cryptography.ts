import z from "zod"
import path from "node:path"
import { Tool } from "./tool"
import { Instance } from "../project/instance"
import { Session } from "../session"
import { Config } from "../config/config"
import { CryptoRuntime } from "../cryptography/runtime"
import { CryptoMethodology } from "../cryptography/methodology"
import { CRYPTO_PHASES, CRYPTO_REFERENCES } from "../cryptography/catalog"
import { sagecell, SAGECELL_URL } from "../cryptography/sagecell"
import { searchReferences } from "../cryptography/reference"
import { CryptoSettings } from "../cryptography/schema"

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
    'Run a reviewed local CTF solver with managed Python, or probe/math helpers. Python example: {"program":"python","script":"solve.py","args":[]}. script is a .py FILE PATH, never inline code; args are only its command-line arguments. Probe example: {"program":"probe","args":["cipher.bin"]}. Optional PATH programs: openssl/hashcat/john. Use a short exploratory timeout before committing to expensive attacks; batch related measurements in one script. This environment is not a sandbox. Stay within challenge scope/query limits.',
  parameters: z.object({
    program: z.enum(["python", "probe", "math", "openssl", "hashcat", "john"]).default("python"),
    script: z
      .string()
      .optional()
      .describe("Path to an existing reviewed .py file, e.g. solve.py; not Python source code"),
    args: z
      .array(z.string())
      .max(100)
      .default([])
      .describe("Arguments passed to the script/helper; omit for an empty array"),
    stdin: z.string().max(1048576).optional(),
    purpose: z
      .enum(["experiment", "solve", "verify"])
      .default("experiment")
      .describe("experiment explores a hypothesis; solve/verify run an established solver/checker"),
    timeout_seconds: z
      .number()
      .int()
      .min(1)
      .max(300)
      .optional()
      .describe("Defaults to 30s for experiments or 120s for established solving/verification, configurable"),
    justification: z
      .string()
      .min(12)
      .max(500)
      .optional()
      .describe("Measured progress or work estimate needed when exceeding the configured purpose budget"),
  }),
  async execute(args, ctx) {
    const settings = CryptoSettings.parse((await Config.get()).cryptography ?? {})
    const budget = args.purpose === "experiment" ? settings.experiment_timeout_seconds : settings.solver_timeout_seconds
    const timeout = args.timeout_seconds ?? budget
    if (timeout > budget && !args.justification)
      throw new Error(
        `The ${args.purpose} budget is ${budget}s. Use that initial limit, or provide justification with measured progress/work estimate before requesting ${timeout}s. A prior timeout alone is not progress.`,
      )
    await ctx.ask({ permission: "crypto_run", patterns: [args.program], always: [args.program], metadata: {} })
    const argv = [...args.args]
    if (args.program === "python") {
      if (!args.script || !/\.py$/i.test(args.script))
        throw new Error(
          'Python requires a reviewed .py FILE PATH in script. Save code with a file tool first, then call {"program":"python","script":"solve.py","args":[]}. Do not put source code in script or the script path in args.',
        )
      argv.unshift(await local(args.script, ctx))
    }
    if (args.program === "probe") {
      if (!argv[0] || argv[0].startsWith("-")) throw new Error("The first probe argument must be a local file.")
      argv[0] = await local(argv[0], ctx)
    }
    const start = performance.now()
    const result = await CryptoRuntime.execute(args.program, argv, {
      cwd: Instance.directory,
      signal: ctx.abort,
      timeout: timeout * 1000,
      stdin: args.stdin,
    })
    if (result.exitCode !== 0)
      throw new Error(
        `${args.program} exited ${result.exitCode} after ${Math.round((performance.now() - start) / 1000)}s (budget ${timeout}s). Inspect output before another attempt; a timeout is not an unsatisfiability proof.\n${result.stdout}\n${result.stderr}`,
      )
    return {
      title: `Crypto ${args.program}`,
      output: result.stdout + (result.stderr ? "\n[stderr]\n" + result.stderr : ""),
      metadata: {
        program: args.program,
        purpose: args.purpose,
        timeout,
        elapsedMs: Math.round(performance.now() - start),
        exitCode: result.exitCode,
      },
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
    "List, keyword-search or read the pinned MIT-licensed ljagiello/ctf-skills crypto reference library. Search ranks individual words and known synonyms (integral/square, lattice/LLL/BKZ), returning nearby lines and headings. A multiword query does not require an exact phrase. Read only matching sections. Snippets require mathematical validation; adapt Sage to the stateless API. Do not run the upstream installer.",
  parameters: z.object({
    action: z.enum(["list", "read", "search"]).default("list"),
    topic: z.enum(CRYPTO_REFERENCES).optional(),
    query: z.string().min(2).max(200).optional(),
    start_line: z
      .number()
      .int()
      .min(0)
      .default(1)
      .describe("First line to read; 0 uses line 1, and the field is ignored for search/list"),
    lines: z
      .number()
      .int()
      .min(0)
      .max(400)
      .default(160)
      .describe("Read length; 0 uses the default 160, and the field is ignored for search/list"),
    limit: z
      .number()
      .int()
      .min(0)
      .max(20)
      .default(8)
      .describe("Maximum ranked search excerpts; 0 uses the default 8, and the field is ignored for read/list"),
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
    if (args.action === "search") {
      const documents = await Promise.all(
        topics.map(async (topic) => ({
          topic,
          text: await Bun.file(await CryptoRuntime.reference(topic + ".md")).text(),
        })),
      )
      const result = searchReferences(documents, args.query!, args.limit || 8)
      return {
        title: "Ranked crypto references",
        output: result.hits.length
          ? result.hits
              .map(
                (hit) =>
                  `# ${hit.topic}:${hit.line} — ${hit.heading}\nMatched: ${hit.matched.join(", ")}\n${hit.excerpt}`,
              )
              .join("\n\n")
          : `No matches for keywords: ${result.terms.join(", ") || "(none)"}. Try one construction or technique, such as integral, nonce, Feistel or lattice, or list the available topics.`,
        metadata: { topics, source: "ljagiello/ctf-skills", commit: "1fdf188cb7ac84a0a2697851aecab156f283e56b" },
      }
    }
    const start = args.start_line || 1
    const count = args.lines || 160
    const sections: string[] = []
    for (const topic of topics) {
      const lines = (await Bun.file(await CryptoRuntime.reference(topic + ".md")).text()).split(/\r?\n/)
      sections.push(
        `# ${topic}: lines ${start}-${Math.min(lines.length, start + count - 1)} of ${lines.length}`,
        ...lines.slice(start - 1, start - 1 + count).map((line, i) => `${i + start}: ${line}`),
      )
    }
    return {
      title: `Crypto reference ${args.action}`,
      output: sections.join("\n") || "No matching sections.",
      metadata: { topics, source: "ljagiello/ctf-skills", commit: "1fdf188cb7ac84a0a2697851aecab156f283e56b" },
    }
  },
})

const PhaseUpdate = z.object({
  phase: z.enum(
    CRYPTO_PHASES.map((phase) => phase.id) as [
      (typeof CRYPTO_PHASES)[number]["id"],
      ...(typeof CRYPTO_PHASES)[number]["id"][],
    ],
  ),
  status: z.enum(["in_progress", "blocked", "completed"]),
  evidence: z.string().min(12).max(4000),
  artifacts: z.array(z.string()).max(10).default([]),
})

export const CryptoMethodologyTool = Tool.define("crypto_methodology", {
  description:
    'Record crypto milestones when useful, preferably in ONE updates array. Default solve workflow requires only recovery and verification; full seven-phase report is optional on user request. Example: {"action":"record","updates":[{"phase":"recovery","status":"completed","evidence":"Solver recovered a candidate","artifacts":["solve.py"]},{"phase":"verification","status":"completed","evidence":"Checker accepted the recovered bytes","artifacts":["verification.txt"]}]}. The tool hashes artifacts itself: do not run probe repeatedly just for hashes. Verification requires local evidence. Updates are atomic; later claims are invalidated when earlier claims change. Records are claims, not mathematical proof.',
  parameters: z.object({
    action: z.enum(["status", "record"]).default("status"),
    workflow: z
      .enum(["solve", "report"])
      .optional()
      .describe("Select report only for a requested full writeup; otherwise use solve"),
    updates: z.array(PhaseUpdate).min(1).max(7).optional().describe("Ordered milestone updates committed together"),
    details: z
      .boolean()
      .default(false)
      .describe("Return full evidence only when explicitly needed; normal replies are compact"),
    phase: z
      .enum(
        CRYPTO_PHASES.map((phase) => phase.id) as [
          (typeof CRYPTO_PHASES)[number]["id"],
          ...(typeof CRYPTO_PHASES)[number]["id"][],
        ],
      )
      .optional(),
    status: z.enum(["in_progress", "blocked", "completed"]).optional(),
    evidence: z.string().min(12).max(4000).optional(),
    artifacts: z.array(z.string()).max(10).default([]),
  }),
  async execute(args, ctx) {
    const sessionID = Session.root(ctx.sessionID)
    if (args.action === "record" && !args.updates && (!args.phase || !args.status || !args.evidence))
      throw new Error("Provide ordered updates, or a single phase/status/evidence record.")
    if (args.updates && (args.phase || args.status || args.evidence))
      throw new Error("Use updates or the legacy single-phase fields, not both.")
    const state =
      args.action === "record"
        ? await CryptoMethodology.record({
            sessionID,
            workflow: args.workflow,
            updates: await Promise.all(
              (
                args.updates ?? [
                  { phase: args.phase!, status: args.status!, evidence: args.evidence!, artifacts: args.artifacts },
                ]
              ).map(async (update) => ({
                ...update,
                artifacts: await Promise.all(update.artifacts.map((file) => local(file, ctx))),
              })),
            ),
            signal: ctx.abort,
          })
        : await CryptoMethodology.read(sessionID, args.workflow)
    return {
      title: `Cryptography ${state.workflow}: ${state.completed}/${state.total} milestones${state.ready ? " — verified candidate" : ""}`,
      output: JSON.stringify(
        args.details
          ? state
          : {
              workflow: state.workflow,
              ready: state.ready,
              completed: state.completed,
              total: state.total,
              phases: state.phases
                .filter((phase) => phase.required || phase.status !== "not_started")
                .map((phase) => ({ id: phase.id, status: phase.status })),
            },
        null,
        2,
      ),
      metadata: { cryptography: state },
    }
  },
})

import z from "zod"
import { Tool } from "./tool"
import { Session } from "../session"
import { Instance } from "../project/instance"
import path from "node:path"
import { PwnRuntime } from "../pwn/runtime"
import { PwnMethodology } from "../pwn/methodology"
import { PWN_PHASES, PWN_REFERENCES } from "../pwn/catalog"
import { searchReferences } from "../cryptography/reference"
async function local(filename: string, ctx: Tool.Context) {
  const file = path.resolve(Instance.directory, filename)
  if (!Instance.containsPath(file))
    await ctx.ask({ permission: "external_directory", patterns: [file], always: [path.dirname(file)], metadata: {} })
  await ctx.ask({ permission: "read", patterns: [file], always: [file], metadata: {} })
  return file
}
export const PwnReferenceTool = Tool.define("pwn_reference", {
  description:
    "List, keyword-search or read the pinned MIT-licensed ljagiello/ctf-skills pwn reference library. Search ranks individual words and known synonyms (stack/ROP, heap/tcache, format-string), returning nearby lines and headings. A multiword query does not require an exact phrase. Read only matching sections. Snippets require primitive and runtime validation; match architecture, allocator and mitigations. Do not run the upstream installer.",
  parameters: z.object({
    action: z.enum(["list", "read", "search"]).default("list"),
    topic: z.enum(PWN_REFERENCES).optional(),
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
        title: "Pwn reference topics",
        output: PWN_REFERENCES.join("\n"),
        metadata: {
          topics: [...PWN_REFERENCES],
          source: "ljagiello/ctf-skills",
          commit: "1fdf188cb7ac84a0a2697851aecab156f283e56b",
        },
      }
    const topics = args.topic ? [args.topic] : [...PWN_REFERENCES]
    if (args.action === "read" && !args.topic) throw new Error("Choose a reference topic to read.")
    if (args.action === "search" && !args.query) throw new Error("A search query is required.")
    if (args.action === "search") {
      const documents = await Promise.all(
        topics.map(async (topic) => ({
          topic,
          text: await Bun.file(await PwnRuntime.reference(topic + ".md")).text(),
        })),
      )
      const result = searchReferences(documents, args.query!, args.limit || 8)
      return {
        title: "Ranked pwn references",
        output: result.hits.length
          ? result.hits
              .map(
                (hit) =>
                  `# ${hit.topic}:${hit.line} — ${hit.heading}\nMatched: ${hit.matched.join(", ")}\n${hit.excerpt}`,
              )
              .join("\n\n")
          : `No matches for keywords: ${result.terms.join(", ") || "(none)"}. Try one construction or technique, such as overflow, ROP, tcache or format string, or list the available topics.`,
        metadata: { topics, source: "ljagiello/ctf-skills", commit: "1fdf188cb7ac84a0a2697851aecab156f283e56b" },
      }
    }
    const start = args.start_line || 1
    const count = args.lines || 160
    const sections: string[] = []
    for (const topic of topics) {
      const lines = (await Bun.file(await PwnRuntime.reference(topic + ".md")).text()).split(/\r?\n/)
      sections.push(
        `# ${topic}: lines ${start}-${Math.min(lines.length, start + count - 1)} of ${lines.length}`,
        ...lines.slice(start - 1, start - 1 + count).map((line, i) => `${i + start}: ${line}`),
      )
    }
    return {
      title: `Pwn reference ${args.action}`,
      output: sections.join("\n") || "No matching sections.",
      metadata: { topics, source: "ljagiello/ctf-skills", commit: "1fdf188cb7ac84a0a2697851aecab156f283e56b" },
    }
  },
})

const PhaseUpdate = z.object({
  phase: z.enum(
    PWN_PHASES.map((phase) => phase.id) as [(typeof PWN_PHASES)[number]["id"], ...(typeof PWN_PHASES)[number]["id"][]],
  ),
  status: z.enum(["in_progress", "blocked", "completed"]),
  evidence: z.string().min(12).max(4000),
  artifacts: z.array(z.string()).max(10).default([]),
})

export const PwnMethodologyTool = Tool.define("pwn_methodology", {
  description:
    'Record pwn milestones when useful, preferably in ONE updates array. Default solve workflow requires only recovery and verification; full seven-phase report is optional on user request. Example: {"action":"record","updates":[{"phase":"recovery","status":"completed","evidence":"Solver recovered a candidate","artifacts":["solve.py"]},{"phase":"verification","status":"completed","evidence":"Checker accepted the recovered bytes","artifacts":["verification.txt"]}]}. The tool hashes artifacts itself: do not run probe repeatedly just for hashes. Verification requires local evidence. Updates are atomic; later claims are invalidated when earlier claims change. Records are claims, not proof of successful exploitation.',
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
        PWN_PHASES.map((phase) => phase.id) as [
          (typeof PWN_PHASES)[number]["id"],
          ...(typeof PWN_PHASES)[number]["id"][],
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
        ? await PwnMethodology.record({
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
        : await PwnMethodology.read(sessionID, args.workflow)
    return {
      title: `Pwn ${state.workflow}: ${state.completed}/${state.total} milestones${state.ready ? " — verified candidate" : ""}`,
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
      metadata: { pwn: state },
    }
  },
})

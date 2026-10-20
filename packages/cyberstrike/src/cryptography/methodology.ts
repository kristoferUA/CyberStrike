import path from "node:path"
import fs from "node:fs/promises"
import { createHash } from "node:crypto"
import { createReadStream } from "node:fs"
import { Global } from "../global"
import { Config } from "../config/config"
import { Lock } from "../util/lock"
import { Identifier } from "../id/id"
import { CRYPTO_PHASES, type CryptoPhase } from "./catalog"
import { CryptoProgress, CryptoSettings } from "./schema"

export namespace CryptoMethodology {
  function file(sessionID: string) {
    Identifier.schema("session").parse(sessionID)
    return path.join(Global.Path.data, "cryptography", "sessions", sessionID + ".json")
  }

  function summarize(state: CryptoProgress): CryptoProgress {
    const phases = state.phases.map((phase) => ({
      ...phase,
      required: state.workflow === "report" || ["recovery", "verification"].includes(phase.id),
    }))
    const required = phases.filter((phase) => phase.required)
    const completed = required.filter((phase) => phase.status === "completed").length
    return {
      ...state,
      phases,
      ready: phases.some((phase) => phase.id === "verification" && phase.status === "completed"),
      completed,
      total: required.length,
      percent: Math.round((100 * completed) / required.length),
      current: required.find((phase) => phase.status !== "completed")?.id,
    }
  }

  export async function read(sessionID: string, workflow?: "solve" | "report"): Promise<CryptoProgress> {
    const source = Bun.file(file(sessionID))
    const configured = CryptoSettings.parse((await Config.get()).cryptography ?? {}).workflow
    if (await source.exists()) {
      const state = CryptoProgress.parse(await source.json())
      return summarize({ ...state, workflow: workflow ?? state.workflow ?? configured })
    }
    return summarize({
      sessionID,
      workflow: workflow ?? configured,
      phases: CRYPTO_PHASES.map((phase) => ({ ...phase, status: "not_started", evidence: "", artifacts: [] })),
      completed: 0,
      total: 0,
      percent: 0,
    })
  }

  export async function record(input: {
    sessionID: string
    workflow?: "solve" | "report"
    updates: {
      phase: CryptoPhase
      status: "in_progress" | "blocked" | "completed"
      evidence: string
      artifacts: string[]
    }[]
    signal?: AbortSignal
  }) {
    const target = file(input.sessionID)
    using _ = await Lock.write(target)
    const state = await read(input.sessionID, input.workflow)
    const hashes = new Map<string, string>()
    for (const update of input.updates) {
      const index = state.phases.findIndex((phase) => phase.id === update.phase)
      if (index < 0) throw new Error("Unknown cryptography phase.")
      const preceding = state.phases.slice(0, index).filter((phase) => phase.required)
      if (update.status !== "blocked" && preceding.some((phase) => phase.status !== "completed"))
        throw new Error(
          "Complete preceding required phases, or batch their evidence in updates. Solve mode requires recovery and verification; report mode requires all seven phases.",
        )
      if (update.phase === "verification" && update.status === "completed" && update.artifacts.length === 0)
        throw new Error(
          "Verification requires a local checker/solver evidence artifact. A candidate flag alone is insufficient.",
        )
      const artifacts = []
      for (const filename of update.artifacts) {
        if (!hashes.has(filename)) {
          const digest = createHash("sha256")
          for await (const chunk of createReadStream(filename, { signal: input.signal })) digest.update(chunk)
          hashes.set(filename, digest.digest("hex"))
        }
        artifacts.push({ path: filename, sha256: hashes.get(filename)! })
      }
      state.phases[index] = {
        ...state.phases[index],
        status: update.status,
        evidence: update.evidence,
        artifacts,
        updated: Date.now(),
      }
      // Revisions invalidate later claims; a batch can re-establish their evidence.
      for (const phase of state.phases.slice(index + 1)) {
        phase.status = "not_started"
        phase.evidence = ""
        phase.artifacts = []
        phase.updated = undefined
      }
    }
    const result = summarize(state)
    await fs.mkdir(path.dirname(target), { recursive: true })
    const temporary = target + "." + crypto.randomUUID() + ".tmp"
    await Bun.write(temporary, JSON.stringify(result, null, 2))
    await fs.rename(temporary, target)
    return result
  }

  export async function context(sessionID: string) {
    const state = await read(sessionID)
    return [
      "Cryptography application state (tool outputs contain the detailed evidence):",
      `Workflow: ${state.workflow}. Required milestones: ${state.completed}/${state.total}. Verified candidate: ${state.ready ? "yes" : "no"}.`,
      state.phases
        .filter((phase) => phase.required || phase.status !== "not_started")
        .map((phase) => `${phase.id}=${phase.status}`)
        .join("; "),
      state.workflow === "solve"
        ? "Return the verified result and solver promptly. Full writeup and optional phase bookkeeping must not delay the answer. Batch any milestone updates."
        : "A full report was selected; batch phase evidence rather than issuing one bookkeeping call per phase.",
    ].join("\n")
  }
}

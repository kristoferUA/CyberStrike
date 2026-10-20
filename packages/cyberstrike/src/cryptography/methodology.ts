import path from "node:path"
import fs from "node:fs/promises"
import { createHash } from "node:crypto"
import { createReadStream } from "node:fs"
import { Global } from "../global"
import { Lock } from "../util/lock"
import { Identifier } from "../id/id"
import { CRYPTO_PHASES, type CryptoPhase } from "./catalog"
import { CryptoProgress } from "./schema"

export namespace CryptoMethodology {
  function file(sessionID: string) {
    Identifier.schema("session").parse(sessionID)
    return path.join(Global.Path.data, "cryptography", "sessions", sessionID + ".json")
  }

  function summarize(state: CryptoProgress): CryptoProgress {
    const completed = state.phases.filter((phase) => phase.status === "completed").length
    return {
      ...state,
      completed,
      total: state.phases.length,
      percent: Math.round((100 * completed) / state.phases.length),
      current: state.phases.find((phase) => phase.status !== "completed")?.id,
    }
  }

  export async function read(sessionID: string): Promise<CryptoProgress> {
    const source = Bun.file(file(sessionID))
    if (await source.exists()) return summarize(CryptoProgress.parse(await source.json()))
    return summarize({
      sessionID,
      phases: CRYPTO_PHASES.map((phase) => ({ ...phase, status: "not_started", evidence: "", artifacts: [] })),
      completed: 0,
      total: CRYPTO_PHASES.length,
      percent: 0,
    })
  }

  export async function record(input: {
    sessionID: string
    phase: CryptoPhase
    status: "in_progress" | "blocked" | "completed"
    evidence: string
    artifacts: string[]
    signal?: AbortSignal
  }) {
    const target = file(input.sessionID)
    using _ = await Lock.write(target)
    const state = await read(input.sessionID)
    const index = state.phases.findIndex((phase) => phase.id === input.phase)
    if (input.status !== "blocked" && state.phases.slice(0, index).some((phase) => phase.status !== "completed")) {
      throw new Error(
        "Complete the preceding cryptography phases or record this phase as blocked with the missing prerequisites.",
      )
    }
    if (input.phase === "verification" && input.status === "completed" && input.artifacts.length === 0) {
      throw new Error(
        "Verification needs a local evidence artifact, such as the solver/checker output. A candidate flag alone is insufficient.",
      )
    }
    const artifacts = await Promise.all(
      input.artifacts.map(async (filename) => {
        const digest = createHash("sha256")
        for await (const chunk of createReadStream(filename, { signal: input.signal })) digest.update(chunk)
        return { path: filename, sha256: digest.digest("hex") }
      }),
    )
    state.phases[index] = {
      ...state.phases[index],
      status: input.status,
      evidence: input.evidence,
      artifacts,
      updated: Date.now(),
    }
    // Changing an earlier claim invalidates downstream completion evidence.
    for (const phase of state.phases.slice(index + 1)) {
      phase.status = "not_started"
      phase.evidence = ""
      phase.artifacts = []
      phase.updated = undefined
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
      "# Cryptography methodology",
      `${state.completed}/${state.total} phases complete (${state.percent}%).`,
      ...state.phases.map(
        (phase) =>
          `[${phase.status}] ${phase.id}: ${phase.name}${phase.evidence ? " — " + phase.evidence.slice(0, 800) : ""}`,
      ),
      "Next: " + (state.current ?? "complete"),
      "Record progress and artifact hashes with crypto_methodology. Completion is an evidence-backed claim, not an automatic correctness certificate.",
    ].join("\n")
  }
}

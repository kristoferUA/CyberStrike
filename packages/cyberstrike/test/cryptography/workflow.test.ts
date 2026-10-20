import { describe, expect, test } from "bun:test"
import path from "node:path"
import { Instance } from "../../src/project/instance"
import { Identifier } from "../../src/id/id"
import { CryptoMethodology } from "../../src/cryptography/methodology"
import { CRYPTO_PHASES } from "../../src/cryptography/catalog"
import { Session } from "../../src/session"
import { SessionCompaction } from "../../src/session/compaction"
import type { Provider } from "../../src/provider/provider"
import { tmpdir } from "../fixture/fixture"
import { CryptoRunTool } from "../../src/tool/cryptography"
import type { Tool } from "../../src/tool/tool"

describe("crypto performance workflow", () => {
  test("crypto_run applies defaults and enforces purpose budgets before spawning", async () => {
    await using tmp = await tmpdir()
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const tool = await CryptoRunTool.init()
        const context: Tool.Context = {
          sessionID: Identifier.ascending("session"),
          messageID: Identifier.ascending("message"),
          agent: "cryptography",
          abort: new AbortController().signal,
          messages: [],
          metadata() {},
          async ask() {},
        }
        await expect(tool.execute({ script: "solve.py", timeout_seconds: 31 } as never, context)).rejects.toThrow(
          "experiment budget is 30s",
        )
        await expect(
          tool.execute({ script: "solve.py", purpose: "verify", timeout_seconds: 121 } as never, context),
        ).rejects.toThrow("verify budget is 120s")
        await expect(tool.execute({ script: "print(1)" } as never, context)).rejects.toThrow("FILE PATH")
      },
    })
  })

  test("crypto compaction respects the user's disable setting", async () => {
    await using tmp = await tmpdir({ config: { compaction: { auto: false } } })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const model = { limit: { context: 400000, input: 272000, output: 32000 }, options: {} } as Provider.Model
        expect(
          await SessionCompaction.isOverflow({
            tokens: { input: 100000, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
            model,
            agent: "cryptography",
          }),
        ).toBe(false)
      },
    })
  })

  test("batches recovery/verification without requiring optional phases", async () => {
    await using tmp = await tmpdir()
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const sessionID = Identifier.ascending("session")
        const artifact = path.join(tmp.path, "verification.txt")
        await Bun.write(artifact, "Independent checker accepted the candidate bytes.")
        const state = await CryptoMethodology.record({
          sessionID,
          updates: [
            {
              phase: "recovery",
              status: "completed",
              evidence: "Recovered a candidate using the saved solver.",
              artifacts: [],
            },
            {
              phase: "verification",
              status: "completed",
              evidence: "Checked against the original construction.",
              artifacts: [artifact],
            },
          ],
        })
        expect(state.ready).toBe(true)
        expect(state.total).toBe(2)
        expect(state.percent).toBe(100)
        expect(state.phases.find((phase) => phase.id === "writeup")!.status).toBe("not_started")
        expect(state.phases.find((phase) => phase.id === "verification")!.artifacts[0].sha256).toHaveLength(64)
        const revised = await CryptoMethodology.record({
          sessionID,
          updates: [
            {
              phase: "recovery",
              status: "completed",
              evidence: "Revised the candidate after correcting byte order.",
              artifacts: [],
            },
          ],
        })
        expect(revised.ready).toBe(false)
        expect(revised.phases.find((phase) => phase.id === "verification")!.status).toBe("not_started")
      },
    })
  })

  test("failed verification batch leaves no partial progress", async () => {
    await using tmp = await tmpdir()
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const sessionID = Identifier.ascending("session")
        await expect(
          CryptoMethodology.record({
            sessionID,
            updates: [
              { phase: "recovery", status: "completed", evidence: "A candidate was recovered.", artifacts: [] },
              { phase: "verification", status: "completed", evidence: "No local evidence supplied.", artifacts: [] },
            ],
          }),
        ).rejects.toThrow("local checker/solver evidence")
        expect((await CryptoMethodology.read(sessionID)).completed).toBe(0)
      },
    })
  })

  test("report mode retains seven ordered phases", async () => {
    await using tmp = await tmpdir()
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const artifact = path.join(tmp.path, "proof.txt")
        await Bun.write(artifact, "Saved verification output.")
        const state = await CryptoMethodology.record({
          sessionID: Identifier.ascending("session"),
          workflow: "report",
          updates: CRYPTO_PHASES.map((phase) => ({
            phase: phase.id,
            status: "completed",
            evidence: "Evidence recorded for " + phase.id,
            artifacts: phase.id === "verification" ? [artifact] : [],
          })),
        })
        expect(state.total).toBe(7)
        expect(state.completed).toBe(7)
      },
    })
  })

  test("crypto context target leaves other agents unchanged", async () => {
    await using tmp = await tmpdir()
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const model = { limit: { context: 400000, input: 272000, output: 32000 }, options: {} } as Provider.Model
        const tokens = { input: 70000, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }
        expect(await SessionCompaction.isOverflow({ tokens, model, agent: "cryptography" })).toBe(true)
        expect(await SessionCompaction.isOverflow({ tokens, model, agent: "cyberstrike" })).toBe(false)
      },
    })
  })

  test("synthetic compaction turn preserves the selected xhigh variant", async () => {
    await using tmp = await tmpdir()
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await Session.create({ title: "effort regression" })
        const model = { providerID: "openai", modelID: "gpt-6-luna" }
        await Session.updateMessage({
          id: Identifier.ascending("message"),
          sessionID: session.id,
          role: "user",
          time: { created: Date.now() },
          agent: "cryptography",
          model,
          variant: "xhigh",
        })
        await SessionCompaction.create({ sessionID: session.id, agent: "cryptography", model, auto: true })
        const latest = (await Session.messages({ sessionID: session.id })).at(-1)!.info
        expect(latest.role === "user" && latest.variant).toBe("xhigh")
      },
    })
  })
})

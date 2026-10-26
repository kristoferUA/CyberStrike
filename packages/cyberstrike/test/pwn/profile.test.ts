import { describe, expect, test } from "bun:test"
import z from "zod"
import path from "node:path"
import { Agent } from "../../src/agent/agent"
import { Instance } from "../../src/project/instance"
import { Identifier } from "../../src/id/id"
import { ToolRegistry } from "../../src/tool/registry"
import { PwnMethodology } from "../../src/pwn/methodology"
import { PWN_REFERENCES, PWN_SKILLS } from "../../src/pwn/catalog"
import { PwnReferenceTool } from "../../src/tool/pwn-reference"
import { PwnRunTool, PwnDebugTool } from "../../src/tool/pwn"
import { searchReferences } from "../../src/cryptography/reference"
import type { Tool } from "../../src/tool/tool"
import { tmpdir } from "../fixture/fixture"

const context: Tool.Context = {
  sessionID: "ses_pwn",
  messageID: "msg_pwn",
  agent: "pwn",
  abort: new AbortController().signal,
  messages: [],
  metadata() {},
  async ask() {},
}

describe("pwn CTF profile", () => {
  test("offers a real pwn profile and serializes every startup tool schema", async () => {
    await using fixture = await tmpdir()
    await Instance.provide({
      directory: fixture.path,
      fn: async () => {
        const agent = await Agent.get("pwn")
        expect(agent.skills).toEqual(PWN_SKILLS)
        const tools = await ToolRegistry.tools({ providerID: "openai", modelID: "gpt-6-luna" }, agent)
        for (const name of ["pwn_environment", "pwn_run", "pwn_debug", "pwn_reference", "pwn_methodology"])
          expect(tools.some((tool) => tool.id === name)).toBe(true)
        for (const tool of tools) expect(z.toJSONSchema(tool.parameters).type).toBe("object")
      },
    })
  })

  test("rejects over-budget or malformed runs before contacting WSL", async () => {
    await using fixture = await tmpdir()
    await Instance.provide({
      directory: fixture.path,
      fn: async () => {
        const run = await PwnRunTool.init()
        await expect(run.execute({ file: "exploit.py", timeout_seconds: 31 } as never, context)).rejects.toThrow(
          "budget is 30s",
        )
        await expect(run.execute({ file: "print(1)" } as never, context)).rejects.toThrow("FILE PATH")
        const debug = await PwnDebugTool.init()
        await expect(debug.execute({ timeout_seconds: 121, purpose: "verify" } as never, context)).rejects.toThrow(
          "budget is 120s",
        )
        await expect(debug.execute({} as never, context)).rejects.toThrow("file path")
      },
    })
  })

  test("pins all reference bytes and retrieves matching heap sections", async () => {
    const root = path.resolve(import.meta.dir, "../../../../.cyberstrike/skill/pwn/ctf-pwn")
    const source = (await Bun.file(path.join(root, "SOURCE.json")).json()) as {
      files: { local: string; sha256: string }[]
    }
    expect(source.files.length).toBe(PWN_REFERENCES.length)
    for (const file of source.files)
      expect(
        new Bun.CryptoHasher("sha256").update(await Bun.file(path.join(root, file.local)).arrayBuffer()).digest("hex"),
      ).toBe(file.sha256)
    const documents = await Promise.all(
      PWN_REFERENCES.map(async (topic) => ({
        topic,
        text: await Bun.file(path.join(root, "references", topic + ".md")).text(),
      })),
    )
    const result = searchReferences(documents, "tcache safe linking heap", 8)
    expect(result.hits.some((hit) => /heap|advanced/.test(hit.topic))).toBe(true)
    const tool = await PwnReferenceTool.init()
    const read = await tool.execute(
      tool.parameters.parse({ action: "read", topic: "overflow-basics", start_line: 0, lines: 0, limit: 0 }),
      context,
    )
    expect(read.output).toStartWith("# overflow-basics: lines 1-160")
  })

  test("records only recovery and fresh-process verification in solve mode", async () => {
    await using fixture = await tmpdir()
    await Instance.provide({
      directory: fixture.path,
      fn: async () => {
        const artifact = path.join(fixture.path, "verification.txt")
        await Bun.write(artifact, "Fresh process returned the expected lab marker.")
        const result = await PwnMethodology.record({
          sessionID: Identifier.ascending("session"),
          updates: [
            {
              phase: "recovery",
              status: "completed",
              evidence: "Saved a reproducible local exploit and its exact input.",
              artifacts: [],
            },
            {
              phase: "verification",
              status: "completed",
              evidence: "Fresh process and original checker accepted the result.",
              artifacts: [artifact],
            },
          ],
        })
        expect(result.ready).toBe(true)
        expect(result.completed).toBe(2)
        expect(result.total).toBe(2)
        expect(result.phases.find((phase) => phase.id === "verification")?.artifacts[0].sha256).toHaveLength(64)
      },
    })
  })
})

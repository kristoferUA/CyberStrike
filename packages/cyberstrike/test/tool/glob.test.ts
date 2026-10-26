import { expect, test } from "bun:test"
import path from "node:path"
import z from "zod"
import { GlobTool } from "../../src/tool/glob"
import { Instance } from "../../src/project/instance"
import type { Tool } from "../../src/tool/tool"
import { tmpdir } from "../fixture/fixture"

test("glob keeps a serializable deadline and reports progress for a bounded search", async () => {
  await using fixture = await tmpdir({
    init: async (dir) => {
      await Bun.write(path.join(dir, "challenge.txt"), "lab")
    },
  })
  await Instance.provide({
    directory: fixture.path,
    fn: async () => {
      const tool = await GlobTool.init()
      expect(z.toJSONSchema(tool.parameters).type).toBe("object")
      expect(tool.parameters.parse({ pattern: "*.txt" }).timeout_seconds).toBe(10)
      const progress: unknown[] = []
      const context: Tool.Context = {
        sessionID: "ses_glob",
        messageID: "msg_glob",
        agent: "pwn",
        abort: new AbortController().signal,
        messages: [],
        async ask() {},
        metadata(value) {
          progress.push(value)
        },
      }
      const result = await tool.execute(tool.parameters.parse({ pattern: "*.txt" }), context)
      expect(result.metadata.count).toBe(1)
      expect(result.output).toContain("challenge.txt")
      expect(progress.length).toBeGreaterThan(0)
    },
  })
})

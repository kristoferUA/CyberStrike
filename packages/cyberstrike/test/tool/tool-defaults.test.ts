import { describe, expect, test } from "bun:test"
import z from "zod"
import { Tool } from "../../src/tool/tool"

const context: Tool.Context = {
  sessionID: "ses_defaults",
  messageID: "msg_defaults",
  agent: "cryptography",
  abort: new AbortController().signal,
  messages: [],
  metadata() {},
  async ask() {},
}

describe("tool argument normalization", () => {
  test("passes defaults and strips unknown transport fields", async () => {
    const schema = z.object({ args: z.array(z.string()).default([]), timeout: z.number().default(30) })
    const tool = Tool.define("defaults-regression", {
      description: "test",
      parameters: schema,
      async execute(args) {
        return { title: "defaults", output: JSON.stringify(args), metadata: { truncated: false } }
      },
    })
    const initialized = await tool.init()
    const result = await initialized.execute({ extra: true } as unknown as z.output<typeof schema>, context)
    expect(JSON.parse(result.output)).toEqual({ args: [], timeout: 30 })
  })

  test("does not accumulate parse wrappers across repeated initialization", async () => {
    const schema = z.object({ value: z.string().transform((value) => value + "!") })
    const definition = {
      description: "test",
      parameters: schema,
      async execute(args: z.output<typeof schema>) {
        return { title: "transform", output: args.value, metadata: { truncated: false } }
      },
    }
    const original = definition.execute
    const tool = Tool.define("transform-regression", definition)
    const first = await tool.init()
    const second = await tool.init()
    expect((await first.execute({ value: "once" }, context)).output).toBe("once!")
    expect((await second.execute({ value: "once" }, context)).output).toBe("once!")
    expect(definition.execute).toBe(original)
  })

  test("rejects invalid arguments before execution", async () => {
    let executed = false
    const tool = Tool.define("invalid-regression", {
      description: "test",
      parameters: z.object({ args: z.array(z.string()).default([]) }),
      async execute() {
        executed = true
        return { title: "invalid", output: "", metadata: { truncated: false } }
      },
    })
    await expect((await tool.init()).execute({ args: [1] } as never, context)).rejects.toThrow("invalid arguments")
    expect(executed).toBe(false)
  })
})

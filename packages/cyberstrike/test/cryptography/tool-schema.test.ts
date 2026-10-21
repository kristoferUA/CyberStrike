import { describe, expect, test } from "bun:test"
import z from "zod"
import { Agent } from "../../src/agent/agent"
import { Instance } from "../../src/project/instance"
import { ToolRegistry } from "../../src/tool/registry"
import {
  CryptoEnvironmentTool,
  CryptoRunTool,
  CryptoSageTool,
  CryptoReferenceTool,
  CryptoMethodologyTool,
} from "../../src/tool/cryptography"
import { tmpdir } from "../fixture/fixture"

describe("cryptography tool schemas", () => {
  test.each([CryptoEnvironmentTool, CryptoRunTool, CryptoSageTool, CryptoReferenceTool, CryptoMethodologyTool])(
    "serializes $id for TUI and Claude MCP without dropping constraints",
    async (definition) => {
      const tool = await definition.init()
      expect(z.toJSONSchema(tool.parameters).type).toBe("object")
      expect(z.toJSONSchema(tool.parameters, { target: "draft-7" }).type).toBe("object")
      if (definition.id === "crypto_reference") {
        const schema = z.toJSONSchema(tool.parameters)
        expect(schema.properties?.start_line).toMatchObject({ type: "integer", minimum: 0, default: 1 })
        expect(schema.properties?.lines).toMatchObject({ type: "integer", minimum: 0, maximum: 400, default: 160 })
      }
    },
  )

  test("serializes the full registry used to start a cryptography turn", async () => {
    await using fixture = await tmpdir()
    await Instance.provide({
      directory: fixture.path,
      fn: async () => {
        const agent = await Agent.get("cryptography")
        const tools = await ToolRegistry.tools({ providerID: "openai", modelID: "gpt-6-luna" }, agent)
        expect(tools.some((tool) => tool.id === "crypto_reference")).toBe(true)
        expect(tools.some((tool) => tool.id === "apply_patch")).toBe(true)
        for (const tool of tools) {
          expect(z.toJSONSchema(tool.parameters).type).toBe("object")
        }
      },
    })
  })
})

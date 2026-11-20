import { expect, test } from "bun:test"
import z from "zod"
import { Agent } from "../../src/agent/agent"
import { Instance } from "../../src/project/instance"
import { PermissionNext } from "../../src/permission/next"
import { ToolRegistry } from "../../src/tool/registry"
import { STEGO_REFERENCES, stegoReference } from "../../src/stego/catalog"
import { tmpdir } from "../fixture/fixture"

test("stego exposes its local tools with serializable schemas and a restrictive profile", async () => {
  await using fixture = await tmpdir()
  await Instance.provide({
    directory: fixture.path,
    fn: async () => {
      const agent = await Agent.get("stego")
      expect(agent.skills).toEqual(["ctf-stego"])
      const tools = await ToolRegistry.tools({ providerID: "openai", modelID: "gpt-6-luna" }, agent)
      for (const name of ["stego_inspect", "stego_bytes", "stego_bits", "stego_spectrum", "stego_reference"]) {
        const tool = tools.find((tool) => tool.id === name)!
        expect(z.toJSONSchema(tool.parameters).type).toBe("object")
        expect(PermissionNext.evaluate(name, "*", agent.permission).action).toBe("allow")
      }
      for (const name of ["bash", "task", "hackbrowser", "webfetch"])
        expect(PermissionNext.evaluate(name, "*", agent.permission).action).toBe("deny")
    },
  })
})

test("all advertised stego reference topics are available as local files", async () => {
  for (const topic of STEGO_REFERENCES) {
    expect(await Bun.file(await stegoReference(topic + ".md")).text()).toStartWith("# ")
  }
})

import { describe, expect, test } from "bun:test"
import path from "node:path"
import { searchReferences } from "../../src/cryptography/reference"
import { CRYPTO_REFERENCES } from "../../src/cryptography/catalog"
import { CryptoReferenceTool } from "../../src/tool/cryptography"
import type { Tool } from "../../src/tool/tool"

const context: Tool.Context = {
  sessionID: "ses_reference",
  messageID: "msg_reference",
  agent: "cryptography",
  abort: new AbortController().signal,
  messages: [],
  metadata() {},
  async ask() {},
}

describe("crypto reference search", () => {
  test("accepts unused zero line fields and normalizes them when reading", async () => {
    const tool = await CryptoReferenceTool.init()
    expect(
      tool.parameters.parse({
        action: "search",
        query: "RSA weak primes factoring shared prime small d leak",
        start_line: 0,
        lines: 0,
        limit: 5,
      }),
    ).toMatchObject({ action: "search", start_line: 0, lines: 0, limit: 5 })
    const result = await tool.execute(
      tool.parameters.parse({ action: "read", topic: "rsa-attacks", start_line: 0, lines: 0 }),
      context,
    )
    expect(result.output).toStartWith("# rsa-attacks: lines 1-160 of ")
    expect(result.output).toContain("\n160: ")
  })

  test("read accepts an unused zero limit without a repair round trip", async () => {
    const tool = await CryptoReferenceTool.init()
    expect(tool.parameters.parse({ action: "read", topic: "modern-ciphers-2", limit: 0 }).limit).toBe(0)
  })

  test("ranks separate keywords and integral/square synonyms", () => {
    const result = searchReferences(
      [
        { topic: "integrals", text: "# Square attack\nIntegral cryptanalysis exploits balanced XOR sums." },
        { topic: "other", text: "# AES\nA block cipher encrypts a block." },
      ],
      "integral cryptanalysis algebraic degree interpolation low-degree block cipher",
    )
    expect(result.hits[0].topic).toBe("integrals")
    expect(result.hits[0].excerpt).toContain("Square attack")
  })

  test("retrieves the relevant section from the real pinned library", async () => {
    const root = path.resolve(import.meta.dir, "../../../../.cyberstrike/skill/cryptography/ctf-crypto/references")
    const documents = await Promise.all(
      CRYPTO_REFERENCES.map(async (topic) => ({
        topic,
        text: await Bun.file(path.join(root, topic + ".md")).text(),
      })),
    )
    const result = searchReferences(
      documents,
      "integral cryptanalysis algebraic degree interpolation low-degree block cipher",
    )
    expect(result.hits.some((hit) => hit.topic === "modern-ciphers-2" && /integral/i.test(hit.excerpt))).toBe(true)
  })

  test("bounds results and handles punctuation/no matches", () => {
    expect(searchReferences([{ topic: "a", text: "nothing relevant" }], "!!!!").hits).toEqual([])
    expect(searchReferences([{ topic: "a", text: "# RSA\n" + "rsa\n".repeat(100) }], "rsa", 2).hits.length).toBe(2)
  })
})

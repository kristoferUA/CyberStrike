import { cmd } from "./cmd"
import { CRYPTO_REFERENCES } from "../../cryptography/catalog"
import { CryptoRuntime } from "../../cryptography/runtime"
import { PWN_REFERENCES } from "../../pwn/catalog"
import { PwnRuntime } from "../../pwn/runtime"
import { searchReferences } from "../../cryptography/reference"

export const KnowledgeCommand = cmd({
  command: "knowledge <action> [value]",
  describe: "read the local category knowledge base from CyberStrike or Codex; no model request",
  builder: (yargs) =>
    yargs
      .positional("action", { type: "string", choices: ["list", "search", "read"], demandOption: true })
      .positional("value", { type: "string", describe: "search query or topic to read" })
      .option("category", { type: "string", choices: ["cryptography", "pwn"], describe: "required for search/read" })
      .option("topic", { type: "string", describe: "restrict search to one topic" })
      .option("start-line", { type: "number", default: 1 })
      .option("lines", { type: "number", default: 120 })
      .option("limit", { type: "number", default: 8 }),
  handler: async (args) => {
    const category = args.category === "cryptography" || args.category === "pwn" ? args.category : undefined
    const catalogs = { cryptography: CRYPTO_REFERENCES, pwn: PWN_REFERENCES }
    if (args.action === "list") {
      console.log(JSON.stringify(category ? { [category]: catalogs[category] } : catalogs, null, 2))
      return
    }
    if (!category || !args.value) throw new Error("Choose --category cryptography|pwn and provide a query/topic.")
    const topics = catalogs[category] as readonly string[]
    const resource = category === "pwn" ? PwnRuntime.reference : CryptoRuntime.reference
    if (args.action === "read") {
      if (!topics.includes(args.value)) throw new Error("Unknown topic. Use knowledge list --category " + args.category)
      if (
        !Number.isInteger(args.lines) ||
        args.lines < 1 ||
        args.lines > 400 ||
        !Number.isInteger(args.startLine) ||
        args.startLine < 1
      )
        throw new Error("Use positive integer --start-line and --lines (maximum 400).")
      const text = (await Bun.file(await resource(args.value + ".md")).text()).split(/\r?\n/)
      console.log(
        text
          .slice(args.startLine - 1, args.startLine - 1 + args.lines)
          .map((line, i) => `${args.startLine + i}: ${line}`)
          .join("\n"),
      )
      return
    }
    if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 20)
      throw new Error("Use --limit between 1 and 20.")
    if (args.topic && !topics.includes(args.topic)) throw new Error("Unknown topic")
    const documents = await Promise.all(
      (args.topic ? [args.topic] : topics).map(async (topic) => ({
        topic,
        text: await Bun.file(await resource(topic + ".md")).text(),
      })),
    )
    console.log(JSON.stringify(searchReferences(documents, args.value, args.limit), null, 2))
  },
})

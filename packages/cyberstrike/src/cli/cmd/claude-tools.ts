import { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool as McpTool,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js"
import z from "zod"
import { cmd } from "./cmd"
import { bootstrap } from "../bootstrap"
import { Instance } from "../../project/instance"
import { Agent } from "../../agent/agent"
import { Session } from "../../session"
import { Identifier } from "../../id/id"
import { ToolRegistry } from "../../tool/registry"
import { PermissionNext } from "../../permission/next"
import { Server } from "../../server/server"
import { HackbrowserTool } from "../../tool/hackbrowser"
import { launchHackbrowser, stopHackbrowser } from "../../tool/hackbrowser-launcher"
import { HackbrowserStatus } from "../../session/hackbrowser-status"
import { Installation } from "../../installation"
import { CLAUDE_CTF } from "./claude"
import { claudePath } from "../../provider/claude-code"
import { CryptoMethodology } from "../../cryptography/methodology"

export const ClaudeToolsCommand = cmd({
  command: "claude-tools",
  describe: "serve CyberStrike CTF tools over MCP stdio for native Claude Code",
  builder: (yargs) =>
    yargs
      .option("model", { type: "string", default: "sonnet", describe: "native Claude Code browser planner model" })
      .option("agent", {
        type: "string",
        choices: ["cyberstrike", "cryptography"] as const,
        default: "cyberstrike",
        describe: "CyberStrike CTF profile",
      })
      .option("claude-path", { type: "string", describe: "path to the official native Claude Code executable" }),
  handler: async (args) => {
    console.log = console.error.bind(console)
    if (args.claudePath) process.env.CYBERSTRIKE_CLAUDE_PATH = args.claudePath
    const executable = claudePath()
    // This dedicated process stores captures; the native Claude session does
    // their analysis. Never start API-backed proxy agents behind the user's back.
    process.env.CYBERSTRIKE_EXTERNAL_ANALYSIS = "true"
    const directory = process.cwd()
    await bootstrap(directory, async () => {
      const agent = await Agent.get(args.agent)
      if (!agent) throw new Error("The CyberStrike agent is unavailable.")
      const session = await Session.create({ title: `Claude Code ${args.agent} CTF` })
      const http =
        args.agent === "cryptography" ? undefined : Server.listen({ hostname: "127.0.0.1", port: 0, webUI: false })
      const server = new McpServer(
        { name: "cyberstrike-ctf", version: Installation.VERSION },
        {
          capabilities: { tools: {} },
          instructions:
            args.agent === "cryptography"
              ? agent.prompt + "\n\n" + (await CryptoMethodology.context(Session.root(session.id)))
              : CLAUDE_CTF,
        },
      )
      // Native Claude supplies file, shell and task tools with its own permission
      // UI. Do not expose CyberStrike subagents that require a separate API model.
      const excluded = new Set([
        "invalid",
        "bash",
        "read",
        "glob",
        "grep",
        "edit",
        "write",
        "apply_patch",
        "task",
        "question",
        "batch",
        "todowrite",
        "todoread",
        "lsp",
        "tool_search",
        "load_tools",
        "unload_tools",
        "list_loaded_tools",
        "hackbrowser",
      ])
      const tools = (await ToolRegistry.tools({ providerID: "claude-code", modelID: args.model }, agent)).filter(
        (tool) => !excluded.has(tool.id),
      )
      const disabled = PermissionNext.disabled(
        [...tools.map((tool) => tool.id), "hackbrowser", "hackbrowser_status", "hackbrowser_stop"],
        agent.permission,
      )
      const browser = await HackbrowserTool.init({ agent })
      const schemas: McpTool[] = tools
        .filter((tool) => !disabled.has(tool.id))
        .map((tool) => ({
          name: tool.id,
          description: tool.description,
          inputSchema: z.toJSONSchema(tool.parameters, {
            target: "draft-7",
            unrepresentable: "any",
          }) as McpTool["inputSchema"],
        }))
      schemas.push(
        {
          name: "hackbrowser",
          description:
            browser.description +
            " In Claude mode, analyze captured requests yourself with the web tools; no API-based proxy agent runs.",
          inputSchema: z.toJSONSchema(browser.parameters, { target: "draft-7" }) as McpTool["inputSchema"],
        },
        {
          name: "hackbrowser_status",
          description: "Get crawl progress and errors for this CyberStrike MCP session.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "hackbrowser_stop",
          description: "Stop this session's active HackBrowser crawl.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
      )
      server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: schemas.filter((tool) => !disabled.has(tool.name)),
      }))
      server.setRequestHandler(
        CallToolRequestSchema,
        async (request, extra) =>
          await Instance.provide({
            directory,
            fn: async (): Promise<CallToolResult> => {
              try {
                const name = request.params.name
                if (disabled.has(name)) throw new Error(`CyberStrike permission denied: ${name}`)
                if (name === "hackbrowser_status")
                  return {
                    content: [
                      { type: "text", text: JSON.stringify(HackbrowserStatus.get(session.id) ?? { phase: "idle" }) },
                    ],
                  }
                if (name === "hackbrowser_stop")
                  return { content: [{ type: "text", text: JSON.stringify({ stopped: stopHackbrowser(session.id) }) }] }
                const tool = tools.find((item) => item.id === name)
                if (!tool && name !== "hackbrowser") throw new Error(`Unknown CyberStrike tool: ${name}`)
                const input = request.params.arguments ?? {}
                const messageID = Identifier.ascending("message")
                await Session.updateMessage({
                  id: messageID,
                  sessionID: session.id,
                  role: "user",
                  time: { created: Date.now() },
                  agent: agent.name,
                  model: { providerID: "claude-code", modelID: args.model },
                })
                const ask: Parameters<typeof browser.execute>[1]["ask"] = async (input) => {
                  for (const pattern of input.patterns) {
                    const rule = PermissionNext.evaluate(input.permission, pattern, agent.permission)
                    if (rule.action === "deny")
                      throw new Error(`CyberStrike permission denied: ${input.permission} ${pattern}`)
                    if (rule.action === "allow") continue
                    if (!server.getClientCapabilities()?.elicitation) {
                      throw new Error(
                        `Approval required for ${input.permission} ${pattern}; the MCP client must support form elicitation.`,
                      )
                    }
                    const reply = await server.elicitInput(
                      {
                        mode: "form",
                        message: `Allow CyberStrike ${input.permission} for ${pattern}?`,
                        requestedSchema: {
                          type: "object",
                          properties: { approve: { type: "boolean", title: "Allow this action", default: false } },
                          required: ["approve"],
                        },
                      },
                      { signal: extra.signal },
                    )
                    if (reply.action !== "accept" || reply.content?.approve !== true)
                      throw new Error("CyberStrike action was not approved.")
                  }
                }
                // SkillTool checks permission against the requested skill name
                // and filters discovery results. A blanket "*" check would
                // incorrectly deny profiles that allow only specific skills.
                if (name !== "hackbrowser" && name !== "skill")
                  await ask({
                    permission: name,
                    patterns: [typeof input.target === "string" ? input.target : "*"],
                    always: [],
                    metadata: {},
                  })
                const result =
                  name === "hackbrowser"
                    ? await (async () => {
                        const value = browser.parameters.parse(input)
                        await ask({
                          permission: "hackbrowser",
                          patterns: [value.target],
                          always: [value.target],
                          metadata: {},
                        })
                        const crawl = await launchHackbrowser({
                          ...value,
                          scope: value.scope ?? [new URL(value.target).hostname],
                          sessionID: session.id,
                          headless: value.credentials?.length ? false : value.headless,
                          claude: { executable, model: args.model },
                        })
                        return { output: JSON.stringify(crawl) }
                      })()
                    : await tool!.execute(input, {
                        sessionID: session.id,
                        messageID,
                        agent: agent.name,
                        callID: String(extra.requestId),
                        abort: extra.signal,
                        messages: [],
                        ask,
                        metadata() {},
                      })
                await Session.updatePart({
                  id: Identifier.ascending("part"),
                  sessionID: session.id,
                  messageID,
                  type: "text",
                  text: `${name}\n${result.output}`,
                })
                return { content: [{ type: "text", text: result.output }] }
              } catch (error) {
                return {
                  isError: true,
                  content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
                }
              }
            },
          }),
      )
      const transport = new StdioServerTransport()
      try {
        await new Promise<void>((resolve, reject) => {
          server.onclose = resolve
          process.once("SIGTERM", resolve)
          process.once("SIGINT", resolve)
          server.connect(transport).catch(reject)
        })
      } finally {
        stopHackbrowser(session.id)
        await server.close()
        await http?.stop(true)
      }
    })
  },
})

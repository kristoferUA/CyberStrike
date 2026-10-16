import os from "node:os"
import path from "node:path"
import { existsSync } from "node:fs"
import z from "zod"
import type { LanguageModelV2, LanguageModelV2CallOptions, LanguageModelV2StreamPart } from "@ai-sdk/provider"

const Output = z.object({
  type: z.literal("result"),
  subtype: z.string(),
  is_error: z.boolean().optional(),
  result: z.string().optional(),
  structured_output: z.unknown().optional(),
  usage: z
    .object({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
      cache_read_input_tokens: z.number().optional(),
      cache_creation_input_tokens: z.number().optional(),
    })
    .optional(),
})

// Claude Code owns authentication and billing. Never read its credential files
// or send subscription tokens through an HTTP provider adapter.
export function claudePath() {
  const configured = process.env.CYBERSTRIKE_CLAUDE_PATH
  const executable = configured
    ? path.resolve(configured)
    : (Bun.which(process.platform === "win32" ? "claude.exe" : "claude") ??
      path.join(os.homedir(), ".local", "bin", process.platform === "win32" ? "claude.exe" : "claude"))
  if (!existsSync(executable) || (process.platform === "win32" && !executable.toLowerCase().endsWith(".exe"))) {
    throw new Error(
      "Native Claude Code was not found. Install it from https://code.claude.com/docs/en/setup, " +
        "then run cyberstrike claude --login. CYBERSTRIKE_CLAUDE_PATH can specify the native executable.",
    )
  }
  return executable
}

export class ClaudeCodeError extends Error {
  override name = "ClaudeCodeError"
}

export function claudeModel(executable: string, model: string, cancel?: AbortSignal): LanguageModelV2 {
  async function generate(options: LanguageModelV2CallOptions) {
    const signal = AbortSignal.any([cancel, options.abortSignal].filter((value): value is AbortSignal => !!value))
    if (options.tools?.length) throw new Error("The Claude Code browser planner does not accept tools.")
    const content = options.prompt.flatMap((message): Record<string, unknown>[] => {
      if (message.role === "system") return []
      return message.content.map((part): Record<string, unknown> => {
        if (part.type === "text" || part.type === "reasoning") return { type: "text", text: part.text }
        if (part.type !== "file" || !part.mediaType.startsWith("image/")) {
          throw new Error("The Claude Code browser planner accepts text and images only.")
        }
        if (part.data instanceof URL) throw new Error("Browser planner images must be supplied inline.")
        return {
          type: "image",
          source: {
            type: "base64",
            media_type: part.mediaType,
            data: typeof part.data === "string" ? part.data : Buffer.from(part.data).toString("base64"),
          },
        }
      })
    })
    const args = [
      executable,
      "-p",
      "--input-format",
      "stream-json",
      "--output-format",
      "json",
      "--model",
      model,
      "--tools",
      "",
      "--disallowedTools",
      "mcp__*",
      "--strict-mcp-config",
      "--mcp-config",
      '{"mcpServers":{}}',
      "--no-session-persistence",
      "--max-turns",
      "3",
    ]
    const system = options.prompt
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n")
    if (system) args.push("--append-system-prompt", system)
    if (options.responseFormat?.type === "json" && options.responseFormat.schema) {
      args.push("--json-schema", JSON.stringify(options.responseFormat.schema))
    }
    signal.throwIfAborted()
    // The planner is a bounded, tool-free native CLI invocation. In particular,
    // it must not load this MCP server recursively from the parent session.
    const proc = Bun.spawn(args, {
      stdin: new TextEncoder().encode(
        JSON.stringify({ type: "user", message: { role: "user", content }, parent_tool_use_id: null }) + "\n",
      ),
      stdout: "pipe",
      stderr: "pipe",
      timeout: 180_000,
      env: Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== "CLAUDECODE")),
    })
    const abort = () => proc.kill()
    signal.addEventListener("abort", abort, { once: true })
    if (signal.aborted) abort()
    try {
      const [stdout, stderr, code] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ])
      signal.throwIfAborted()
      if (code !== 0) throw new Error(`Claude Code planner exited (${code}): ${(stderr || stdout).slice(-2000)}`)
      const result = Output.parse(JSON.parse(stdout))
      if (result.is_error || result.subtype !== "success") {
        throw new Error(`Claude Code planner failed: ${result.result ?? result.subtype ?? "unknown error"}`)
      }
      const text = result.structured_output === undefined ? result.result : JSON.stringify(result.structured_output)
      if (typeof text !== "string") throw new Error("Claude Code planner returned no text.")
      return {
        content: [{ type: "text" as const, text }],
        finishReason: "stop" as const,
        usage: {
          inputTokens: result.usage?.input_tokens,
          outputTokens: result.usage?.output_tokens,
          cachedInputTokens: result.usage?.cache_read_input_tokens,
          totalTokens:
            (result.usage?.input_tokens ?? 0) +
            (result.usage?.output_tokens ?? 0) +
            (result.usage?.cache_read_input_tokens ?? 0) +
            (result.usage?.cache_creation_input_tokens ?? 0),
        },
        warnings: [],
      }
    } catch (error) {
      signal.throwIfAborted()
      throw new ClaudeCodeError(error instanceof Error ? error.message : String(error))
    } finally {
      signal.removeEventListener("abort", abort)
    }
  }
  return {
    specificationVersion: "v2",
    provider: "claude-code",
    modelId: model,
    supportedUrls: {},
    doGenerate: generate,
    async doStream(options) {
      const result = await generate(options)
      return {
        stream: new ReadableStream<LanguageModelV2StreamPart>({
          start(controller) {
            controller.enqueue({ type: "stream-start", warnings: result.warnings })
            controller.enqueue({ type: "text-start", id: "0" })
            controller.enqueue({ type: "text-delta", id: "0", delta: result.content[0].text })
            controller.enqueue({ type: "text-end", id: "0" })
            controller.enqueue({ type: "finish", finishReason: result.finishReason, usage: result.usage })
            controller.close()
          },
        }),
      }
    },
  }
}

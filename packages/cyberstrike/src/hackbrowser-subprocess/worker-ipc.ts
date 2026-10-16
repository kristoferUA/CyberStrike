// IPC message types shared between hackbrowser-launcher (parent) and
// hackbrowser-worker (child). Transport: UTF-8 JSON lines over stdin/stdout.
// One JSON object per line. No framing needed — each line is a complete message.

import type { CSEvent } from "@cyberstrike-io/hackbrowser/api"

// ============================================================
// Serializable model descriptor — parent extracts this from
// Provider state so the worker can reconstruct a LanguageModel
// without importing cyberstrike's Provider system.
// ============================================================

export interface ModelDescriptor {
  npm: string
  apiKey?: string
  // Native Claude Code planner: executable path only, never OAuth credentials.
  claudeCodePath?: string
  baseURL?: string
  modelApiId: string
  headers?: Record<string, string>
  // From the model catalog's `capabilities.temperature`. When false (recent
  // Claude 4.7+/fable and the GPT-5 family reject sampling params), the worker
  // strips temperature/top_p/top_k before sending. Mirrors what the main
  // process does in-process (ProviderTransform.temperature).
  supportsTemperature?: boolean
  // GitHub OAuth token (ghu_…) for Copilot. When set, the worker EXCHANGES it
  // for a short-lived Copilot session token (copilot-session.ts) and adds the
  // integration/editor headers Copilot validates. The raw token is not accepted
  // by api.githubcopilot.com directly (403) — see #107.
  copilotToken?: string
  // GHE domain (e.g. "company.ghe.com") when the Copilot auth is enterprise, so
  // the worker exchanges the token at api.{domain} instead of api.github.com.
  copilotEnterpriseDomain?: string
}

// ============================================================
// Serializable credential dispatch — mirrors CrawlOptions auth
// fields but without method calls.
// ============================================================

export type CredentialDispatch =
  | { kind: "none" }
  | { kind: "single"; credentialID: string }
  | { kind: "multi"; multiCredentials: { id: string }[] }

// ============================================================
// WorkerOptions — everything the worker needs to call runCrawl.
// All fields are JSON-serializable primitives or plain objects.
// ============================================================

export interface WorkerOptions {
  url: string
  sessionID?: string
  scope?: string[]
  exclude?: string[]
  steps?: number
  headless: boolean
  panel: boolean
  cyberstrikeUrl: string
  model: ModelDescriptor
  credentialDispatch: CredentialDispatch
  cdp?: string
}

// ============================================================
// Parent → Worker (stdin)
// ============================================================

export type ParentMessage = { type: "start"; options: WorkerOptions } | { type: "abort" }

// ============================================================
// Worker → Parent (stdout)
// ============================================================

export interface WorkerUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

export type WorkerMessage =
  | { type: "log"; level: "debug" | "info" | "warn" | "error"; service: string; message: string; extra?: unknown }
  | { type: "event"; event: CSEvent }
  | { type: "result"; pagesExplored: number; capturedEndpoints: number; errors: string[]; usage: WorkerUsage }
  | { type: "error"; message: string }

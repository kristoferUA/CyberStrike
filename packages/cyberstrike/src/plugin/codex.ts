import { createRemoteJWKSet, jwtVerify } from "jose"
import type { Hooks, PluginInput } from "@cyberstrike-io/plugin"
import { Auth, OAUTH_DUMMY_KEY } from "../auth"
import { Global } from "../global"
import { Lock } from "../util/lock"
import { ProviderTransform } from "../provider/transform"
import type { Provider } from "../provider/provider"
import fs from "node:fs/promises"
import path from "node:path"

const ISSUER = "https://auth.openai.com"
const AUTHORIZE_URL = `${ISSUER}/api/accounts/authorize`
const TOKEN_URL = `${ISSUER}/api/accounts/oauth/token`
const JWKS = createRemoteJWKSet(new URL("https://auth.openai.com/.well-known/jwks.json"))
const API_BASE_URL = "https://api.openai.com/v1"
const RESOURCE = API_BASE_URL
const REQUIRED_SCOPES = ["chatgpt.tokens.use.direct", "resource.invoke"]
const HOST_ID_FILE = path.join(Global.Path.data, "openai-chatgpt-host.json")
const CALLBACK_PATH = "/auth/callback"
const CALLBACK_TIMEOUT_MS = 10 * 60 * 1000

type OAuthTokens = {
  access_token: string
  refresh_token: string
  id_token: string
  token_type?: string
  expires_in?: number
  scope?: string
}

type CallbackResult = {
  code?: string
  clientId?: string
  scope?: string
  error?: string
}

// Kept as small compatibility helpers for extensions that import the former
// plugin module. These decoded claims are informational only; authorization
// relies on verifyIdentity() and a JWKS signature check below.
export interface IdTokenClaims {
  chatgpt_account_id?: string
  organizations?: Array<{ id: string }>
  email?: string
  "https://api.openai.com/auth"?: { chatgpt_account_id?: string }
}

export function parseJwtClaims(token: string): IdTokenClaims | undefined {
  const parts = token.split(".")
  if (parts.length !== 3) return undefined
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString())
  } catch {
    return undefined
  }
}

export function extractAccountIdFromClaims(claims: IdTokenClaims) {
  return (
    claims.chatgpt_account_id ||
    claims["https://api.openai.com/auth"]?.chatgpt_account_id ||
    claims.organizations?.[0]?.id
  )
}

export function extractAccountId(tokens: { id_token?: string; access_token?: string; refresh_token?: string }) {
  for (const token of [tokens.id_token, tokens.access_token]) {
    if (!token) continue
    const claims = parseJwtClaims(token)
    const accountId = claims && extractAccountIdFromClaims(claims)
    if (accountId) return accountId
  }
  return undefined
}

function base64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url")
}

function randomValue(size = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(size)))
}

async function createPKCE() {
  const verifier = randomValue(48)
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
  return { verifier, challenge: base64Url(new Uint8Array(digest)) }
}

async function getHostId() {
  const stored = await Bun.file(HOST_ID_FILE)
    .json()
    .catch(() => undefined)
  if (typeof stored?.hostId === "string" && stored.hostId.startsWith("urn:uuid:")) return stored.hostId

  const hostId = `urn:uuid:${crypto.randomUUID()}`
  const temporary = `${HOST_ID_FILE}.${crypto.randomUUID()}.tmp`
  await Bun.write(temporary, JSON.stringify({ hostId }), { mode: 0o600 })
  await fs.rename(temporary, HOST_ID_FILE)
  return hostId
}

function parseScopes(value?: string) {
  return [...new Set((value ?? "").split(/\s+/).filter(Boolean))]
}

function hasPlanScopes(scopes: string[]) {
  return REQUIRED_SCOPES.every((scope) => scopes.includes(scope))
}

function startCallbackListener(expectedState: string) {
  let resolve!: (result: CallbackResult) => void
  let reject!: (error: Error) => void
  let settled = false
  const callback = new Promise<CallbackResult>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const url = new URL(request.url)
      if (request.method !== "GET" || url.pathname !== CALLBACK_PATH) {
        return new Response("Not found", { status: 404 })
      }

      const state = url.searchParams.get("state")
      if (!state || state !== expectedState) {
        return new Response("Invalid OAuth state. Return to CyberStrike and try again.", { status: 400 })
      }

      if (settled) return new Response("This sign-in request has already been used.", { status: 410 })
      settled = true
      resolve({
        code: url.searchParams.get("code") ?? undefined,
        clientId: url.searchParams.get("client_id") ?? undefined,
        scope: url.searchParams.get("scope") ?? undefined,
        error: url.searchParams.get("error") ?? undefined,
      })

      return new Response(
        "<!doctype html><meta charset=utf-8><title>CyberStrike</title><p>Sign-in response received. Return to CyberStrike.</p>",
        { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
      )
    },
  })

  const timer = setTimeout(() => {
    if (settled) return
    settled = true
    reject(new Error("ChatGPT sign-in timed out. Start sign-in again from CyberStrike."))
  }, CALLBACK_TIMEOUT_MS)

  return {
    callback,
    redirectUri: `http://127.0.0.1:${server.port}${CALLBACK_PATH}`,
    close() {
      clearTimeout(timer)
      server.stop(true)
    },
  }
}

function buildAuthorizationUrl(input: {
  clientId: string
  redirectUri: string
  state: string
  nonce: string
  challenge: string
  hostId: string
  isFirstRegistration: boolean
  idTokenHint?: string
  email?: string
}) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    scope: "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct",
    resource: RESOURCE,
    state: input.state,
    nonce: input.nonce,
    code_challenge_method: "S256",
    code_challenge: input.challenge,
    ext_agent_host_id: input.hostId,
  })
  if (input.isFirstRegistration) params.set("agent_name_hint", "CyberStrike")
  else {
    if (input.idTokenHint) params.set("id_token_hint", input.idTokenHint)
    if (input.email) params.set("login_hint", input.email)
  }
  return `${AUTHORIZE_URL}?${params}`
}

async function exchangeCode(code: string, clientId: string, redirectUri: string, verifier: string) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: verifier,
      resource: RESOURCE,
    }),
  })
  if (!response.ok) throw new Error(`ChatGPT token exchange failed (${response.status}). Start sign-in again.`)
  return (await response.json()) as OAuthTokens
}

async function verifyIdentity(idToken: string, clientId: string, nonce: string) {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: ISSUER,
    audience: clientId,
    requiredClaims: ["sub", "exp", "iat"],
    clockTolerance: 5,
  })
  if (payload.nonce !== nonce) throw new Error("The ChatGPT sign-in response did not match this request.")
  if (typeof payload.sub !== "string" || !payload.sub) throw new Error("The verified ChatGPT identity is missing.")
  return payload
}

async function refreshTokens(auth: Auth.Info & { type: "oauth" }) {
  if (!auth.clientId) throw new Error("Sign in again with ChatGPT to refresh this connection.")
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: auth.refresh,
      client_id: auth.clientId,
      resource: RESOURCE,
    }),
  })
  if (!response.ok) throw new Error(`ChatGPT token refresh failed (${response.status}). Sign in again.`)
  return (await response.json()) as OAuthTokens
}

function emptyCost() {
  return { input: 0, output: 0, cache: { read: 0, write: 0 } }
}

function planRequest(payload: Record<string, unknown>) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !Array.isArray(payload.input)) {
    throw new Error("ChatGPT plan requests require the conversation history in an input array.")
  }
  // The plan-usage preview accepts a narrower Responses payload than API keys.
  // https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations
  for (const key of [
    "background",
    "conversation",
    "max_output_tokens",
    "max_tool_calls",
    "metadata",
    "moderation",
    "multi_agent",
    "prompt",
    "prompt_cache_retention",
    "safety_identifier",
    "temperature",
    "top_logprobs",
    "top_p",
    "truncation",
    "user",
    "previous_response_id",
  ])
    delete payload[key]
  payload.store = false
  payload.stream = true
  payload.input = payload.input.map((item: Record<string, unknown>) => {
    const { id, ...value } = item
    return value.role === "system" ? { ...value, role: "developer" } : value
  })
  if (Array.isArray(payload.tools)) {
    const tools = payload.tools as Record<string, unknown>[]
    const local = tools.filter((tool) => tool.type === "function" || tool.type === "custom")
    if (local.length) {
      // Preserve plain tool names for the AI SDK's local tool execution.
      payload.input = [{ type: "additional_tools", role: "developer", tools: local }, ...(payload.input as unknown[])]
      payload.tools = tools.filter((tool) => tool.type !== "function" && tool.type !== "custom")
    }
  }
  return payload
}

// generateText/generateObject callers expect JSON, while plan usage requires
// HTTP streaming. Return the completed response only after its terminal event.
async function completedResponse(response: Response) {
  if (!response.ok) return response
  if (!response.body) throw new Error("ChatGPT returned an empty response stream.")
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      buffer = (buffer + decoder.decode(chunk.value, { stream: true })).replace(/\r\n/g, "\n")
      let end: number
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, end)
        buffer = buffer.slice(end + 2)
        const data = frame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n")
        if (!data || data === "[DONE]") continue
        const event = JSON.parse(data) as {
          type: string
          response?: Record<string, unknown>
          message?: string
          code?: string
        }
        if (event.type === "response.completed" && event.response) return Response.json(event.response)
        if (["response.failed", "response.incomplete", "error"].includes(event.type)) {
          return Response.json(
            {
              error: event.response?.error ?? {
                message: event.message ?? `ChatGPT inference did not complete (${event.type}).`,
                code: event.code ?? event.type,
              },
            },
            { status: 502 },
          )
        }
      }
    }
    throw new Error("ChatGPT stream ended without response.completed.")
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

type CatalogModel = { visibility?: string; slug?: string; display_name?: string }

function accountModels(provider: { models: Record<string, unknown> }, catalog: CatalogModel[]) {
  const previous = provider.models
  const models: Record<string, Provider.Model> = {}

  for (const item of catalog) {
    if (item?.visibility !== "list" || typeof item.slug !== "string" || !item.slug) continue
    const existing = previous[item.slug] as Provider.Model | undefined
    const model: Provider.Model = existing
      ? { ...existing }
      : {
          id: item.slug,
          providerID: "openai",
          api: { id: item.slug, url: API_BASE_URL, npm: "@ai-sdk/openai" },
          name: item.display_name || item.slug,
          capabilities: {
            temperature: false,
            reasoning: true,
            attachment: false,
            toolcall: true,
            input: { text: true, audio: false, image: false, video: false, pdf: false },
            output: { text: true, audio: false, image: false, video: false, pdf: false },
            interleaved: false,
          },
          cost: emptyCost(),
          limit: { context: 400_000, input: 272_000, output: 128_000 },
          status: "active",
          options: {},
          headers: {},
          release_date: new Date().toISOString().slice(0, 10),
          variants: {},
        }

    model.id = item.slug
    model.providerID = "openai"
    model.name = item.display_name || model.name || item.slug
    model.api = { ...model.api, id: item.slug, url: API_BASE_URL, npm: "@ai-sdk/openai" }
    model.cost = emptyCost()
    model.variants = ProviderTransform.variants(model)
    models[item.slug] = model
  }

  if (Object.keys(models).length === 0) throw new Error("ChatGPT did not return any models available to this account.")
  provider.models = models
}

export async function ChatGPTPlanAuthPlugin(input: PluginInput): Promise<Hooks> {
  return {
    auth: {
      provider: "openai",
      async loader(getAuth, provider) {
        const auth = (await getAuth()) as Auth.Info
        if (auth.type !== "oauth") return {}
        if (!auth.clientId || !auth.scopes || !hasPlanScopes(auth.scopes)) {
          throw new Error("Reconnect OpenAI using ChatGPT plan (Sign in with ChatGPT) and approve plan usage.")
        }

        async function validAuth(invalidated?: string) {
          using lock = await Lock.write("auth.openai.refresh")
          const current = (await getAuth()) as Auth.Info
          if (current.type !== "oauth" || !current.clientId || !current.scopes || !hasPlanScopes(current.scopes)) {
            throw new Error("Sign in with ChatGPT and approve plan usage before using this model.")
          }
          if (current.access !== invalidated && current.expires > Date.now() + 60_000) return current

          const next = await refreshTokens(current)
          const scopes = parseScopes(next.scope || current.scopes.join(" "))
          if (!hasPlanScopes(scopes)) throw new Error("ChatGPT plan usage is not authorized for this connection.")
          const updated = {
            type: "oauth" as const,
            refresh: next.refresh_token || current.refresh,
            access: next.access_token,
            expires: Date.now() + (next.expires_in ?? 3600) * 1000,
            accountId: current.accountId,
            clientId: current.clientId,
            idToken: current.idToken,
            subject: current.subject,
            email: current.email,
            hostId: current.hostId,
            scopes,
          }
          await input.client.auth.set({ path: { id: "openai" }, body: updated })
          return updated
        }

        const initialAuth = await validAuth()
        const modelsResponse = await fetch(`${API_BASE_URL}/models`, {
          headers: { Authorization: `Bearer ${initialAuth.access}` },
        })
        if (!modelsResponse.ok) throw new Error(`Could not load ChatGPT models (${modelsResponse.status}).`)
        const catalog = (await modelsResponse.json()) as { models?: CatalogModel[] }
        accountModels(provider, catalog.models ?? [])

        return {
          apiKey: OAUTH_DUMMY_KEY,
          baseURL: API_BASE_URL,
          maxRetries: 0,
          fetch: async (requestInput: RequestInfo | URL, init?: RequestInit) => {
            const request = requestInput instanceof Request ? requestInput : undefined
            const parsed = new URL(
              requestInput instanceof URL
                ? requestInput.href
                : typeof requestInput === "string"
                  ? requestInput
                  : requestInput.url,
            )
            if (parsed.origin !== API_BASE_URL.replace(/\/v1$/, "") || parsed.pathname !== "/v1/responses") {
              throw new Error("ChatGPT plan sign-in only allows the public OpenAI Responses API.")
            }

            const method = (init?.method ?? request?.method ?? "POST").toUpperCase()
            if (method !== "POST") throw new Error("ChatGPT Responses requests must use POST.")

            const rawBody = init?.body ?? (request ? await request.clone().text() : undefined)
            if (typeof rawBody !== "string") throw new Error("The OpenAI Responses request body is missing.")
            const original: Record<string, unknown> = JSON.parse(rawBody)
            const streaming = original?.stream === true
            const payload = planRequest(original)

            const headers = new Headers(init?.headers ?? request?.headers)
            headers.delete("authorization")
            const current = await validAuth()
            headers.set("authorization", `Bearer ${current.access}`)
            headers.set("content-type", "application/json")

            let response = await fetch(parsed, { ...init, method, headers, body: JSON.stringify(payload) })
            if (response.status === 401) {
              headers.set("authorization", `Bearer ${(await validAuth(current.access)).access}`)
              response = await fetch(parsed, { ...init, method, headers, body: JSON.stringify(payload) })
            }
            return streaming ? response : completedResponse(response)
          },
        }
      },
      methods: [
        {
          label: "ChatGPT plan (Sign in with ChatGPT)",
          type: "oauth",
          authorize: async () => {
            const existing = await Auth.get("openai")
            const existingOAuth = existing?.type === "oauth" ? existing : undefined
            const isFirstRegistration = !existingOAuth?.clientId
            const clientId = isFirstRegistration ? "dynamic_agent_client" : existingOAuth.clientId!
            const hostId = existingOAuth?.hostId ?? (await getHostId())
            const pkce = await createPKCE()
            const state = randomValue()
            const nonce = randomValue()
            const listener = startCallbackListener(state)
            const url = buildAuthorizationUrl({
              clientId,
              redirectUri: listener.redirectUri,
              state,
              nonce,
              challenge: pkce.challenge,
              hostId,
              isFirstRegistration,
              idTokenHint: existingOAuth?.idToken,
              email: existingOAuth?.email,
            })

            return {
              url,
              instructions:
                "Sign in in your browser and review the CyberStrike ChatGPT plan usage request. Approve it there to continue.",
              method: "auto" as const,
              callback: async () => {
                try {
                  const result = await listener.callback
                  if (result.error) throw new Error(`ChatGPT authorization was not completed (${result.error}).`)
                  if (!result.code) throw new Error("The ChatGPT callback did not include an authorization code.")

                  const issuedClientId = result.clientId ?? (isFirstRegistration ? undefined : clientId)
                  if (!issuedClientId)
                    throw new Error("ChatGPT did not return the registered client ID. Start sign-in again.")
                  if (!isFirstRegistration && result.clientId && result.clientId !== clientId) {
                    throw new Error(
                      "ChatGPT returned a different client registration. The existing connection was left unchanged.",
                    )
                  }

                  const tokens = await exchangeCode(result.code, issuedClientId, listener.redirectUri, pkce.verifier)
                  if (!tokens.access_token || !tokens.refresh_token || !tokens.id_token) {
                    throw new Error("ChatGPT did not return all required credentials. Start sign-in again.")
                  }
                  const identity = await verifyIdentity(tokens.id_token, issuedClientId, nonce)
                  if (existingOAuth?.subject && existingOAuth.subject !== identity.sub) {
                    throw new Error(
                      "This ChatGPT sign-in is for a different account. Sign out before switching accounts.",
                    )
                  }

                  const scopes = parseScopes(tokens.scope || result.scope)
                  if (!hasPlanScopes(scopes)) {
                    throw new Error(
                      "ChatGPT plan usage was not authorized. Reconnect and approve the plan usage request.",
                    )
                  }

                  return {
                    type: "success" as const,
                    refresh: tokens.refresh_token,
                    access: tokens.access_token,
                    expires: Date.now() + (tokens.expires_in ?? 3600) * 1000,
                    clientId: issuedClientId,
                    idToken: tokens.id_token,
                    subject: identity.sub,
                    email: typeof identity.email === "string" ? identity.email : undefined,
                    hostId,
                    scopes,
                  }
                } finally {
                  listener.close()
                }
              },
            }
          },
        },
        {
          type: "api",
          label: "OpenAI API Key (optional)",
          prompts: [
            {
              type: "text",
              key: "key",
              message: "OpenAI API key",
              placeholder: "sk-...",
            },
          ],
          authorize: async (inputs) => {
            if (!inputs?.key) return { type: "failed" as const }
            return { type: "success" as const, key: inputs.key }
          },
        },
      ],
    },
  }
}

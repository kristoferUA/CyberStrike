import { Global } from "../global"
import { Log } from "../util/log"
import path from "path"
import z from "zod"
import { Installation } from "../installation"
import { Flag } from "../flag/flag"
import { lazy } from "@/util/lazy"

export namespace ModelsDev {
  const log = Log.create({ service: "models.dev" })
  const filepath = path.join(Global.Path.cache, "models.json")

  export const Model = z.object({
    id: z.string(),
    name: z.string(),
    family: z.string().optional(),
    release_date: z.string(),
    attachment: z.boolean(),
    reasoning: z.boolean(),
    temperature: z.boolean(),
    tool_call: z.boolean(),
    interleaved: z
      .union([
        z.literal(true),
        z
          .object({
            field: z.enum(["reasoning", "reasoning_content", "reasoning_details"]),
          })
          .strict(),
      ])
      .optional(),
    cost: z
      .object({
        input: z.number(),
        output: z.number(),
        cache_read: z.number().optional(),
        cache_write: z.number().optional(),
        context_over_200k: z
          .object({
            input: z.number(),
            output: z.number(),
            cache_read: z.number().optional(),
            cache_write: z.number().optional(),
          })
          .optional(),
      })
      .optional(),
    limit: z.object({
      context: z.number(),
      input: z.number().optional(),
      output: z.number(),
    }),
    modalities: z
      .object({
        input: z.array(z.enum(["text", "audio", "image", "video", "pdf"])),
        output: z.array(z.enum(["text", "audio", "image", "video", "pdf"])),
      })
      .optional(),
    experimental: z
      .union([
        z.boolean(),
        z.object({
          modes: z
            .record(
              z.string(),
              z.object({
                cost: z
                  .object({
                    input: z.number().optional(),
                    output: z.number().optional(),
                    cache_read: z.number().optional(),
                  })
                  .optional(),
                provider: z
                  .object({
                    body: z.record(z.string(), z.any()).optional(),
                    headers: z.record(z.string(), z.string()).optional(),
                  })
                  .optional(),
              }),
            )
            .optional(),
        }),
      ])
      .optional(),
    status: z.enum(["alpha", "beta", "deprecated"]).optional(),
    options: z.record(z.string(), z.any()),
    headers: z.record(z.string(), z.string()).optional(),
    provider: z.object({ npm: z.string().optional(), api: z.string().optional() }).optional(),
    reasoning_options: z
      .array(
        z.union([
          z.object({ type: z.literal("effort"), values: z.array(z.string()) }),
          z.object({ type: z.literal("toggle") }),
          z.object({ type: z.literal("budget_tokens"), min: z.number().optional(), max: z.number().optional() }),
        ]),
      )
      .optional(),
    structured_output: z.boolean().optional(),
    variants: z.record(z.string(), z.record(z.string(), z.any())).optional(),
  })
  export type Model = z.infer<typeof Model>

  export const Provider = z.object({
    api: z.string().optional(),
    name: z.string(),
    env: z.array(z.string()),
    id: z.string(),
    npm: z.string().optional(),
    models: z.record(z.string(), Model),
  })

  export type Provider = z.infer<typeof Provider>

  function url() {
    return Flag.CYBERSTRIKE_MODELS_URL || "https://models.dev"
  }

  async function fetchCatalog() {
    const response = await fetch(`${url()}/api.json`, {
      headers: { "User-Agent": Installation.USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`Model catalog returned HTTP ${response.status}`)
    const catalog: unknown = await response.json()
    if (!catalog || typeof catalog !== "object" || Array.isArray(catalog) || !Object.keys(catalog).length)
      throw new Error("Model catalog is not a provider map")
    return catalog as Record<string, Provider>
  }

  export const Data = lazy(async () => {
    const file = Bun.file(Flag.CYBERSTRIKE_MODELS_PATH ?? filepath)
    const result = await file.json().catch(() => {})
    if (result) return result
    // @ts-ignore
    const snapshot = await import("./models-snapshot")
      .then((m) => m.snapshot as Record<string, unknown>)
      .catch(() => undefined)
    if (snapshot) return snapshot
    if (Flag.CYBERSTRIKE_DISABLE_MODELS_FETCH) return {}
    try {
      return await fetchCatalog()
    } catch (error) {
      log.debug("No local model catalog and refresh unavailable", { error })
      // Source checkouts may lack a snapshot; configured models still work.
      Data.reset()
      return {}
    }
  })

  export async function get() {
    const result = await Data()
    return result as Record<string, Provider>
  }

  export async function refresh() {
    if (Flag.CYBERSTRIKE_DISABLE_MODELS_FETCH) throw new Error("CYBERSTRIKE_DISABLE_MODELS_FETCH is enabled")
    const catalog = await fetchCatalog()
    await Bun.write(filepath, JSON.stringify(catalog))
    Data.reset()
  }

  export function startRefresh() {
    if (Flag.CYBERSTRIKE_DISABLE_MODELS_FETCH || Flag.CYBERSTRIKE_MODELS_PATH) return
    const update = () =>
      refresh().catch((error) => {
        log.debug("Model catalog refresh unavailable; keeping local catalog", { error })
      })
    void update()
    setInterval(update, 60 * 60 * 1000).unref()
  }
}

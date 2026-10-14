import path from "path"
import fs from "node:fs/promises"
import { Global } from "../global"
import z from "zod"

export const OAUTH_DUMMY_KEY = "cyberstrike-oauth-dummy-key"

export namespace Auth {
  export const Oauth = z
    .object({
      type: z.literal("oauth"),
      refresh: z.string(),
      access: z.string(),
      expires: z.number(),
      accountId: z.string().optional(),
      enterpriseUrl: z.string().optional(),
      clientId: z.string().optional(),
      idToken: z.string().optional(),
      subject: z.string().optional(),
      email: z.string().optional(),
      hostId: z.string().optional(),
      scopes: z.array(z.string()).optional(),
    })
    .meta({ ref: "OAuth" })

  export const Api = z
    .object({
      type: z.literal("api"),
      key: z.string(),
    })
    .meta({ ref: "ApiAuth" })

  export const WellKnown = z
    .object({
      type: z.literal("wellknown"),
      key: z.string(),
      token: z.string(),
    })
    .meta({ ref: "WellKnownAuth" })

  export const Info = z.discriminatedUnion("type", [Oauth, Api, WellKnown]).meta({ ref: "Auth" })
  export type Info = z.infer<typeof Info>

  const filepath = path.join(Global.Path.data, "auth.json")

  export async function get(providerID: string) {
    const auth = await all()
    return auth[providerID]
  }

  export async function all(): Promise<Record<string, Info>> {
    const file = Bun.file(filepath)
    const data = await file.json().catch(() => ({}) as Record<string, unknown>)
    return Object.entries(data).reduce(
      (acc, [key, value]) => {
        const parsed = Info.safeParse(value)
        if (!parsed.success) return acc
        acc[key] = parsed.data
        return acc
      },
      {} as Record<string, Info>,
    )
  }

  export async function set(key: string, info: Info) {
    const data = await all()
    const temporary = `${filepath}.${crypto.randomUUID()}.tmp`
    await Bun.write(temporary, JSON.stringify({ ...data, [key]: info }, null, 2), { mode: 0o600 })
    await fs.rename(temporary, filepath)
  }

  export async function remove(key: string) {
    const data = await all()
    delete data[key]
    const temporary = `${filepath}.${crypto.randomUUID()}.tmp`
    await Bun.write(temporary, JSON.stringify(data, null, 2), { mode: 0o600 })
    await fs.rename(temporary, filepath)
  }
}

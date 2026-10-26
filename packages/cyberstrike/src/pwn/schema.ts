import z from "zod"
import { CryptoProgress, CryptoSettings } from "../cryptography/schema"

export const PwnSettings = CryptoSettings.extend({
  distribution: z
    .string()
    .regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/)
    .default("Ubuntu"),
})
export const PwnProgress = CryptoProgress
export type PwnProgress = z.infer<typeof PwnProgress>

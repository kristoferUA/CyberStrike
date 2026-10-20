import z from "zod"
export const CryptoProgress = z.object({
  sessionID: z.string(),
  phases: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      requirement: z.string(),
      status: z.enum(["not_started", "in_progress", "blocked", "completed"]),
      evidence: z.string(),
      artifacts: z.array(z.object({ path: z.string(), sha256: z.string() })),
      updated: z.number().optional(),
    }),
  ),
  completed: z.number(),
  total: z.number(),
  percent: z.number(),
  current: z.string().optional(),
})
export type CryptoProgress = z.infer<typeof CryptoProgress>

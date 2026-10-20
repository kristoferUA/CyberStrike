import z from "zod"

export const CryptoSettings = z.object({
  workflow: z.enum(["solve", "report"]).default("solve"),
  experiment_timeout_seconds: z.number().int().min(1).max(300).default(30),
  solver_timeout_seconds: z.number().int().min(1).max(300).default(120),
  context_target_tokens: z.number().int().min(16000).max(256000).default(64000),
})

export const CryptoProgress = z.object({
  sessionID: z.string(),
  workflow: z.enum(["solve", "report"]).optional(),
  ready: z.boolean().optional(),
  phases: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      requirement: z.string(),
      status: z.enum(["not_started", "in_progress", "blocked", "completed"]),
      evidence: z.string(),
      artifacts: z.array(z.object({ path: z.string(), sha256: z.string() })),
      updated: z.number().optional(),
      required: z.boolean().optional(),
    }),
  ),
  completed: z.number(),
  total: z.number(),
  percent: z.number(),
  current: z.string().optional(),
})
export type CryptoProgress = z.infer<typeof CryptoProgress>

import { z } from 'zod'

export const JoinParamsSchema = z.object({
  paths: z.array(z.string()).default([]),
})

export type JoinParams = z.infer<typeof JoinParamsSchema>

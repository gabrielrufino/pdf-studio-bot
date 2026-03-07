import { z } from 'zod'

export const PutPasswordParamsSchema = z.object({
  path: z.string().nullable(),
})

export type PutPasswordParams = z.infer<typeof PutPasswordParamsSchema>

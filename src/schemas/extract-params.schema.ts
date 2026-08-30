import { z } from 'zod'

export const ExtractParamsSchema = z.object({
  path: z.string().nullable(),
})

export type ExtractParams = z.infer<typeof ExtractParamsSchema>

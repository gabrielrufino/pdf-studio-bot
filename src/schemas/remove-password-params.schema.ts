import { z } from 'zod'

export const RemovePasswordParamsSchema = z.object({
  path: z.string().nullable(),
})

export type RemovePasswordParams = z.infer<typeof RemovePasswordParamsSchema>

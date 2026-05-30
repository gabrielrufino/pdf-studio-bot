import { z } from 'zod'

export const PasswordParamsSchema = z.object({
  path: z.string().nullable(),
})

export type PasswordParams = z.infer<typeof PasswordParamsSchema>

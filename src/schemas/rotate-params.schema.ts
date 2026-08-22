import { z } from 'zod'

export const rotateParamsSchema = z.object({
  file_id: z.string(),
})

export type RotateParams = z.infer<typeof rotateParamsSchema>

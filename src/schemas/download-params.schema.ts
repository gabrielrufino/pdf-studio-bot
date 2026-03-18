import { z } from 'zod'

export const DownloadParamsSchema = z.object({
  url: z.string().nullable(),
  path: z.string().nullable().optional(),
})

export type DownloadParams = z.infer<typeof DownloadParamsSchema>

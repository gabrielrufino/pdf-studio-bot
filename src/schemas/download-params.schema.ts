import { z } from 'zod'

export const DownloadParamsSchema = z.object({
  url: z.string().nullable(),
})

export type DownloadParams = z.infer<typeof DownloadParamsSchema>

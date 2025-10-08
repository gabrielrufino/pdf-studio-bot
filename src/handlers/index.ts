import type { Handler } from '../interfaces/handler.interface'

import { DownloadHandler } from './download.handler'
import { FeedbackHandler } from './feedback.handler'
import { PutPasswordHandler } from './put-password.handler'

export const handlers: Array<{ new(): Handler }> = [
  DownloadHandler,
  FeedbackHandler,
  PutPasswordHandler,
]

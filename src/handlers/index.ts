import type { Handler } from '../interfaces/handler.interface'

import { DownloadHandler } from './download.handler'
import { PutPasswordHandler } from './put-password.handler'

export const handlers: Array<{ new(): Handler }> = [
  DownloadHandler,
  PutPasswordHandler,
]

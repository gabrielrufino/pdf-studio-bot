import type { Handler } from '../interfaces/handler.interface'

import { DownloadHandler } from './download.handler'
import { FeedbackHandler } from './feedback.handler'
import { HelpHandler } from './help.handler'
import { PutPasswordHandler } from './put-password.handler'
import { StartHandler } from './start.handler'
import { VersionHandler } from './version.handler'

export const handlers: Array<Handler> = [
  new DownloadHandler(),
  new FeedbackHandler(),
  new HelpHandler(),
  new StartHandler(),
  new PutPasswordHandler(),
  new VersionHandler(),
]

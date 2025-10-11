import type { BaseHandler } from './base.handler'
import { database } from '../config/database'
import { DownloadHandler } from './download.handler'
import { FeedbackHandler } from './feedback.handler'
import { HelpHandler } from './help.handler'
import { PutPasswordHandler } from './put-password.handler'
import { StartHandler } from './start.handler'
import { VersionHandler } from './version.handler'
import { FeedbackRepository } from '../repositories/feedback.repository'

export const handlers: Array<BaseHandler> = [
  new DownloadHandler(),
  new FeedbackHandler(
    new FeedbackRepository(database),
  ),
  new HelpHandler(),
  new StartHandler(),
  new PutPasswordHandler(),
  new VersionHandler(),
]

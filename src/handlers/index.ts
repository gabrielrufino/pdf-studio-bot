import type { BaseHandler } from './base.handler'
import { database } from '../config/database'
import { FeedbackRepository } from '../repositories/feedback.repository'
import { UserRepository } from '../repositories/user.repository'
import { DownloadHandler } from './download.handler'
import { FeedbackHandler } from './feedback.handler'
import { HelpHandler } from './help.handler'
import { PutPasswordHandler } from './put-password.handler'
import { StartHandler } from './start.handler'
import { VersionHandler } from './version.handler'

export const handlers: Array<BaseHandler> = [
  new DownloadHandler(),
  new FeedbackHandler(
    new FeedbackRepository(database),
  ),
  new HelpHandler(),
  new StartHandler(
    new UserRepository(database),
  ),
  new PutPasswordHandler(),
  new VersionHandler(),
]

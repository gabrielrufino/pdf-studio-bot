import type { BaseHandler } from './base.handler'
import { browser } from '../config/browser'
import { database } from '../config/database'
import { FeedbackRepository } from '../repositories/feedback.repository'
import { UserRepository } from '../repositories/user.repository'
import { DownloadHandler } from './download.handler'
import { FeedbackHandler } from './feedback.handler'
import { HelpHandler } from './help.handler'
import { JoinHandler } from './join.handler'
import { PutPasswordHandler } from './put-password.handler'
import { SplitHandler } from './split.handler'
import { StartHandler } from './start.handler'
import { VersionHandler } from './version.handler'

const coreHandlers: Array<BaseHandler> = [
  new DownloadHandler(browser),
  new FeedbackHandler(
    new FeedbackRepository(database),
  ),
  new JoinHandler(),
  new PutPasswordHandler(),
  new SplitHandler(),
  new StartHandler(
    new UserRepository(database),
  ),
  new VersionHandler(),
]

const helpHandler = new HelpHandler(coreHandlers)

export const handlers: Array<BaseHandler> = [
  helpHandler,
  ...coreHandlers,
]

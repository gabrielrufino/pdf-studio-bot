import type { BaseHandler } from './base.handler'
import { ai } from '../config/ai'
import { browser } from '../config/browser'
import { feedbackRepository, userRepository } from '../repositories'
import { DownloadHandler } from './download.handler'
import { FeedbackHandler } from './feedback.handler'
import { HelpHandler } from './help.handler'
import { JoinHandler } from './join.handler'
import { PutPasswordHandler } from './put-password.handler'
import { SplitHandler } from './split.handler'
import { StartHandler } from './start.handler'
import { SummaryHandler } from './summary.handler'
import { VersionHandler } from './version.handler'

const coreHandlers: Array<BaseHandler> = [
  new DownloadHandler(browser),
  new FeedbackHandler(feedbackRepository),
  new JoinHandler(),
  new PutPasswordHandler(),
  new SplitHandler(),
  new StartHandler(userRepository),
  new SummaryHandler(userRepository, ai),
  new VersionHandler(),
]

const helpHandler = new HelpHandler(coreHandlers)

export const handlers: Array<BaseHandler> = [
  helpHandler,
  ...coreHandlers,
]

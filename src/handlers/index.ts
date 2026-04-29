import type { BaseHandler } from './base.handler'
import { ai } from '../config/ai'
import { browser } from '../config/browser'
import { feedbackRepository, paymentRepository, userRepository } from '../repositories'
import { DownloadHandler } from './download.handler'
import { FeedbackHandler } from './feedback.handler'
import { HelpHandler } from './help.handler'
import { JoinHandler } from './join.handler'
import { ProHandler } from './pro.handler'
import { PutPasswordHandler } from './put-password.handler'
import { SplitHandler } from './split.handler'
import { StartHandler } from './start.handler'
import { SummaryHandler } from './summary.handler'
import { ToDocxHandler } from './to-docx.handler'
import { VersionHandler } from './version.handler'

const coreHandlers: Array<BaseHandler> = [
  new DownloadHandler(browser, userRepository),
  new FeedbackHandler(feedbackRepository),
  new JoinHandler(userRepository),
  new ProHandler(userRepository, paymentRepository),
  new PutPasswordHandler(userRepository),
  new SplitHandler(userRepository),
  new StartHandler(userRepository),
  new SummaryHandler(userRepository, ai),
  new ToDocxHandler(userRepository),
  new VersionHandler(),
]

const helpHandler = new HelpHandler(coreHandlers)

export const handlers: Array<BaseHandler> = [
  helpHandler,
  ...coreHandlers,
]

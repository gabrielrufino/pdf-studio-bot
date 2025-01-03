import type { FileFlavor } from '@grammyjs/files'
import type { Context, SessionFlavor } from 'grammy'
import type { SessionData } from '../interfaces/session-data'
import process from 'node:process'
import { hydrateFiles } from '@grammyjs/files'
import { Bot, session } from 'grammy'
import { logger } from './logger'

type CustomContext = FileFlavor<Context> & SessionFlavor<SessionData>

const bot = new Bot<CustomContext>(process.env.BOT_TOKEN!)

bot.use(
  session({
    initial: (): SessionData => ({
      command: null,
      params: null,
    }),
  }),
)

bot.use((ctx, next) => {
  const { from } = ctx
  logger.info({
    from,
  })

  return next()
})

bot
  .api
  .config
  .use(hydrateFiles(bot.token))

export { bot }

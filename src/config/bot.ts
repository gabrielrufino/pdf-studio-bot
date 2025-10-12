import type { FileFlavor } from '@grammyjs/files'
import type { Context, SessionFlavor } from 'grammy'
import type { SessionData } from '../interfaces/session-data'
import process from 'node:process'
import { hydrateFiles } from '@grammyjs/files'
import { Bot, session } from 'grammy'
import { MessageEntity } from '../entities/message.entity'
import { MessageRepository } from '../repositories/message.repository'
import { UserRepository } from '../repositories/user.repository'
import { database } from './database'
import { logger } from './logger'

export type CustomContext = FileFlavor<Context> & SessionFlavor<SessionData>

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

const messageRepository = new MessageRepository(database)
const userRepository = new UserRepository(database)

bot.use(async (ctx, next) => {
  if (ctx.message) {
    const message = new MessageEntity({
      text: ctx.message.text || '',
      telegram_user: ctx.from!,
    })

    await messageRepository.create(message)
  }

  return next()
})

bot.use(async (ctx, next) => {
  if (!ctx.from?.id) {
    ctx.reply('Unable to identify you. Access denied.')
    return
  }

  const user = await userRepository.findByTelegramId(ctx.from.id)

  if (user?.is_blocked) {
    ctx.reply('You are blocked from using this bot.')
    return
  }

  next()
})

bot
  .api
  .config
  .use(hydrateFiles(bot.token))

export { bot }

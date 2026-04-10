import type { FilterQuery } from 'grammy'
import process from 'node:process'
import { run } from '@grammyjs/runner'

import { bot } from './config/bot'
import { browser } from './config/browser'
import { database } from './config/database'
import { logger } from './config/logger'
import { InvalidFileError } from './errors/invalid-file.error'
import { SessionValidationError } from './errors/session-validation.error'
import { handlers } from './handlers'
import { FeedbackRepository } from './repositories/feedback.repository'
import { MessageRepository } from './repositories/message.repository'
import { UserRepository } from './repositories/user.repository'

async function main() {
  const userRepository = new UserRepository(database)
  const messageRepository = new MessageRepository(database)
  const feedbackRepository = new FeedbackRepository(database)

  await Promise.all([
    userRepository.init(),
    messageRepository.init(),
    feedbackRepository.init(),
  ])

  for (const handler of handlers) {
    bot.command(handler.command, handler.onCommand.bind(handler))
  }

  const events = new Set(handlers.flatMap(handler => Object.keys(handler.events)))
  for (const event of events) {
    bot.on(event as FilterQuery, async (ctx) => {
      const command = ctx.session.command
      const handler = handlers.find(h => h.command === command)

      if (handler) {
        const eventHandler = handler.events[event as FilterQuery]
        if (eventHandler) {
          try {
            await eventHandler(ctx)
          }
          catch (error) {
            if (error instanceof SessionValidationError) {
              await ctx.reply(`⚠️ ${error.message}`)
              ctx.session.command = null
              ctx.session.params = null
              return
            }

            if (error instanceof InvalidFileError) {
              return
            }

            throw error
          }
        }
      }
    })
  }

  bot.catch((err) => {
    logger.error(err)
  })

  const runner = run(bot)

  await bot.api.setMyCommands(
    handlers.map(h => ({ command: h.command, description: h.description })),
  )

  const stop = async () => {
    logger.info('Shutting down gracefully...')
    await runner.stop()
    await browser.close()
    process.exit(0)
  }

  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)

  logger.info('Bot is running...')
}

void main()

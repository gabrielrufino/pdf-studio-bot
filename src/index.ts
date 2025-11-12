import type { FilterQuery } from 'grammy'
import { run } from '@grammyjs/runner'

import { bot } from './config/bot'
import { database } from './config/database'
import { logger } from './config/logger'
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
          await eventHandler(ctx)
        }
      }
    })
  }

  run(bot)

  logger.info('Bot is running...')
}

void main()

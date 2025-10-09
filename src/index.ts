import type { FilterQuery } from 'grammy'
import { bot } from './config/bot'

import { handlers } from './handlers'
import { FeedbackRepository } from './repositories/feedback.repository'
import { MessageRepository } from './repositories/message.repository'
import { UserRepository } from './repositories/user.repository'

async function main() {
  const userRepository = new UserRepository()
  const messageRepository = new MessageRepository()
  const feedbackRepository = new FeedbackRepository()

  await Promise.all([
    userRepository.init(),
    messageRepository.init(),
    feedbackRepository.init(),
  ])

  for (const handler of handlers) {
    bot.command(handler.command, handler.onCommand)
  }

  new Set(handlers.map(handler => Object.keys(handler.events)).flat())
    .forEach((event) => {
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
    })

  bot.start()
}

void main()

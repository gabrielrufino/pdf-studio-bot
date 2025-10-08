import { bot } from './config/bot'

import { FeedbackRepository } from './repositories/feedback.repository'
import { MessageRepository } from './repositories/message.repository'
import { UserRepository } from './repositories/user.repository'
import './commands'
import './events'

async function main() {
  const userRepository = new UserRepository()
  const messageRepository = new MessageRepository()
  const feedbackRepository = new FeedbackRepository()

  await Promise.all([
    userRepository.init(),
    messageRepository.init(),
    feedbackRepository.init(),
  ])
  bot.start()
}

void main()

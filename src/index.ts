import { bot } from './config/bot'

import { MessageRepository } from './repositories/message.repository'
import { UserRepository } from './repositories/user.repository'
import './commands'
import './events'

async function main() {
  const userRepository = new UserRepository()
  const messageRepository = new MessageRepository()

  await Promise.all([
    userRepository.init(),
    messageRepository.init(),
  ])
  bot.start()
}

void main()

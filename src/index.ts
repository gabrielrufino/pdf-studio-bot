import { bot } from './config/bot'

import './commands'
import './events'

async function main() {
  bot.start()
}

main()

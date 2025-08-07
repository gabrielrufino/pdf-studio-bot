import { bot } from '../config/bot'
import { handlers } from '../handlers'

import './help.command'
import './start.command'
import './version.command'

for (const Handler of handlers) {
  const handler = new Handler()

  bot.command(handler.command, handler.onCommand)
}

import { version } from '../../package.json'
import { bot } from '../config/bot'

bot.command('version', async (ctx) => {
  return ctx.reply(version)
})

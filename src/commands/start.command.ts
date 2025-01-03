import { bot } from '../config/bot'
import { HelpMessage } from '../messages/help.message'
import { WelcomeMessage } from '../messages/welcome.message'

bot.command('start', async (ctx) => {
  await ctx.reply(
    new WelcomeMessage()
      .build(),
    { parse_mode: 'HTML' },
  )

  return ctx.reply(
    new HelpMessage()
      .build(),
  )
})

import { bot } from "../config/bot";
import { HelpMessage } from "../messages/help.message";

bot.command('help', async ctx => {
  ctx.reply(
    new HelpMessage()
      .build()
  )
})

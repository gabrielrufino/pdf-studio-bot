import { bot } from '../config/bot'
import { orm } from '../config/orm'
import { UserEntity } from '../entities/user.entity'
import { HelpMessage } from '../messages/help.message'
import { WelcomeMessage } from '../messages/welcome.message'

bot.command('start', async (ctx) => {
  await orm
    .em
    .fork()
    .insert(UserEntity, {
      telegram_user: ctx.from,
    })

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

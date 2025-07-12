import { bot } from '../config/bot'
import { database } from '../config/database'
import { UserEntity } from '../entities/user.entity'
import { HelpMessage } from '../messages/help.message'
import { WelcomeMessage } from '../messages/welcome.message'

bot.command('start', async (ctx) => {
  const user = new UserEntity({
    telegram_user: ctx.from,
  })

  await database
    .collection('users')
    .insertOne(user)

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

import { bot } from '../config/bot'
import { UserEntity } from '../entities/user.entity'
import { HelpMessage } from '../messages/help.message'
import { WelcomeMessage } from '../messages/welcome.message'
import { UserRepository } from '../repositories/user.repository'

const userRepository = new UserRepository()

bot.command('start', async (ctx) => {
  const user = await userRepository.findByTelegramId(ctx.from!.id!)
  if (!user) {
    await userRepository.create(new UserEntity({
      telegram_user: ctx.from,
    }))
  }
  else {
    await userRepository.updateById(user._id, user)
  }

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

import type { CustomContext } from '../config/bot'
import type { UserRepository } from '../repositories/user.repository'
import { UserEntity } from '../entities/user.entity'
import { CommandEnum } from '../enums/command.enum'
import { HelpMessage } from '../messages/help.message'
import { WelcomeMessage } from '../messages/welcome.message'
import { BaseHandler } from './base.handler'

export class StartHandler extends BaseHandler {
  constructor(
    private readonly userRepository: UserRepository,
  ) {
    super()
  }

  public readonly command = CommandEnum.Start
  public readonly events = {}

  async onCommand(ctx: CustomContext) {
    const user = await this.userRepository.findByTelegramId(ctx.from!.id)
    if (!user) {
      await this.userRepository.create(new UserEntity({
        telegram_user: ctx.from,
      }))
    }
    else {
      await this.userRepository.updateById(user._id, user)
    }

    await ctx.reply(
      new WelcomeMessage()
        .build(),
      { parse_mode: 'HTML' },
    )

    await ctx.reply(
      new HelpMessage()
        .build(),
    )
  }
}

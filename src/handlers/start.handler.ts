import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { UserEntity } from '../entities/user.entity'
import { CommandEnum } from '../enums/command.enum'
import { LanguageEnum } from '../enums/language.enum'
import { WelcomeMessage } from '../messages/welcome.message'
import { BaseHandler } from './base.handler'

export class StartHandler extends BaseHandler {
  constructor(
    private readonly userRepository: UserRepository,
  ) {
    super()
  }

  public readonly command = CommandEnum.Start
  public readonly description = '🚀 Start using the bot'
  public readonly hasUsageLimits = false
  public readonly events = {}

  async onCommand(ctx: CustomContext) {
    await this.resetSession(ctx)
    const user = await this.userRepository.findByTelegramId(ctx.from!.id)
    if (user === null) {
      const language = (['en', 'pt', 'es'].includes(ctx.from?.language_code || '')
        ? ctx.from?.language_code
        : LanguageEnum.English) as LanguageEnum

      await this.userRepository.create(new UserEntity({
        telegram_user: ctx.from,
        language,
      }))

      ctx.session.language = language
    }
    else {
      await this.userRepository.updateById(user._id, user)
    }

    await ctx.reply(
      new WelcomeMessage(ctx)
        .build(),
      { parse_mode: 'HTML' },
    )
  }
}

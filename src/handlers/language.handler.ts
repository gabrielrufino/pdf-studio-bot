import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { InlineKeyboard } from 'grammy'
import { CommandEnum } from '../enums/command.enum'
import { LanguageEnum } from '../enums/language.enum'
import { BaseHandler } from './base.handler'

export class LanguageHandler extends BaseHandler {
  constructor(private readonly userRepository: UserRepository) {
    super()
  }

  public readonly command = CommandEnum.Language
  public readonly description = '🌐 Change your language'
  public readonly hasUsageLimits = false
  public readonly events = {
    callback_query: async (ctx: CustomContext) => {
      const data = ctx.callbackQuery?.data
      if (!data || !Object.values(LanguageEnum).includes(data as LanguageEnum)) {
        return
      }

      const user = await this.userRepository.findByTelegramId(ctx.from!.id)
      if (user) {
        user.language = data as LanguageEnum
        await this.userRepository.updateById(user._id, user)
      }

      await ctx.answerCallbackQuery(ctx.t('language_changed'))
      await ctx.editMessageText(ctx.t('language_changed'))
      await this.resetSession(ctx)
    },
  }

  async onCommand(ctx: CustomContext) {
    await this.setSessionCommand(ctx)
    const keyboard = new InlineKeyboard()
      .text('English', LanguageEnum.English)
      .row()
      .text('Português', LanguageEnum.Portuguese)
      .row()
      .text('Español', LanguageEnum.Spanish)

    await ctx.reply(ctx.t('language_choose'), {
      reply_markup: keyboard,
    })
  }
}

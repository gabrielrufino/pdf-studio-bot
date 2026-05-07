import type { CustomContext } from '../types/custom-context.type'
import { CommandEnum } from '../enums/command.enum'
import { HelpMessage } from '../messages/help.message'
import { BaseHandler } from './base.handler'

export class HelpHandler extends BaseHandler {
  constructor(private readonly handlers: BaseHandler[]) {
    super()
  }

  readonly command = CommandEnum.Help
  readonly description = '❓ Show the list of available commands'
  readonly hasUsageLimits = false
  readonly events = {
    callback_query: async (ctx: CustomContext) => {
      const command = ctx.callbackQuery?.data
      const handler = [this, ...this.handlers].find(h => h.command === command)

      if (handler) {
        await ctx.answerCallbackQuery()
        await handler.onCommand(ctx)
      }
    },
  }

  async onCommand(ctx: CustomContext) {
    const { text, reply_markup } = new HelpMessage([this, ...this.handlers]).build()
    await ctx.reply(text, { reply_markup })
  }
}

import type { CustomContext } from '../config/bot'
import { CommandEnum } from '../enums/command.enum'
import { HelpMessage } from '../messages/help.message'
import { BaseHandler } from './base.handler'

export class HelpHandler extends BaseHandler {
  readonly command = CommandEnum.Help
  readonly events = {}

  async onCommand(ctx: CustomContext) {
    await ctx.reply(
      new HelpMessage()
        .build(),
    )
  }
}

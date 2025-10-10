import type { CustomContext } from '../config/bot'
import type { Handler } from '../interfaces/handler.interface'
import { CommandEnum } from '../enums/command.enum'
import { HelpMessage } from '../messages/help.message'

export class HelpHandler implements Handler {
  readonly command = CommandEnum.Help
  readonly events = {}

  async onCommand(ctx: CustomContext) {
    await ctx.reply(
      new HelpMessage()
        .build(),
    )
  }
}

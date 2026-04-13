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
  readonly events = {}

  async onCommand(ctx: CustomContext) {
    await ctx.reply(
      new HelpMessage([this, ...this.handlers]).build(),
    )
  }
}

import type { CustomContext } from '../config/bot'
import type { Handler } from '../interfaces/handler.interface'
import { version } from '../../package.json'
import { CommandEnum } from '../enums/command.enum'

export class VersionHandler implements Handler {
  public readonly command = CommandEnum.Version
  public readonly events = {}

  async onCommand(ctx: CustomContext) {
    await ctx.reply(version)
  }
}

import type { CustomContext } from '../types/custom-context.type'
import { version } from '../../package.json'
import { CommandEnum } from '../enums/command.enum'
import { BaseHandler } from './base.handler'

export class VersionHandler extends BaseHandler {
  public readonly command = CommandEnum.Version
  public readonly events = {}

  async onCommand(ctx: CustomContext) {
    await ctx.reply(version)
  }
}

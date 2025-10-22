import type { CommandEnum } from '../enums/command.enum'
import type { CustomContext } from '../types/custom-context.type'

export abstract class BaseHandler {
  public abstract readonly command: CommandEnum
  public abstract readonly events: Record<string, (ctx: CustomContext) => Promise<void>>
  public abstract onCommand(ctx: CustomContext): Promise<void>

  protected setSessionCommand(ctx: CustomContext) {
    ctx.session.command = this.command
  }

  protected clearSession(ctx: CustomContext) {
    ctx.session.command = null
    ctx.session.params = null
  }
}

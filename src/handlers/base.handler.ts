import type { z } from 'zod'
import type { CommandEnum } from '../enums/command.enum'
import type { CustomContext } from '../types/custom-context.type'
import { logger } from '../config/logger'
import { SessionValidationError } from '../errors/session-validation.error'

export abstract class BaseHandler {
  public abstract readonly command: CommandEnum
  public abstract readonly events: Record<string, (ctx: CustomContext) => Promise<void>>
  public abstract onCommand(ctx: CustomContext): Promise<void>

  protected readonly logger = logger

  protected validateParams<T>(schema: z.ZodSchema<T>, params: any): T {
    const result = schema.safeParse(params)

    if (!result.success) {
      throw new SessionValidationError()
    }

    return result.data
  }

  protected setSessionCommand(ctx: CustomContext) {
    ctx.session.command = this.command
  }

  protected clearSession(ctx: CustomContext) {
    ctx.session.command = null
    ctx.session.params = null
  }
}

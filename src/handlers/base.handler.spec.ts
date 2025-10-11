import type { CustomContext } from '../config/bot'
import { describe, expect, it } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { BaseHandler } from './base.handler'

describe(BaseHandler.name, () => {
  class TestHandler extends BaseHandler {
    readonly command = CommandEnum.Test
    readonly events = {}
    async onCommand() {}

    // Expose protected methods for testing
    public setSessionCommand(ctx: CustomContext) {
      super.setSessionCommand(ctx)
    }

    public clearSession(ctx: CustomContext) {
      super.clearSession(ctx)
    }
  }

  it('should set session command correctly', () => {
    const handler = new TestHandler()
    const ctx = {
      session: {
        command: null,
        params: null,
      },
    } as CustomContext

    handler.setSessionCommand(ctx)

    expect(ctx.session.command).toBe(CommandEnum.Test)
  })

  it('should clear session correctly', () => {
    const handler = new TestHandler()
    const ctx = {
      session: {
        command: CommandEnum.Test,
        params: { someParam: 'value' },
      },
    } as unknown as CustomContext

    handler.clearSession(ctx)

    expect(ctx.session.command).toBeNull()
    expect(ctx.session.params).toBeNull()
  })
})

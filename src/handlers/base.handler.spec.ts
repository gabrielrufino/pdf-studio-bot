import type { CustomContext } from '../types/custom-context.type'
import { describe, expect, it } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { BaseHandler } from './base.handler'

describe(BaseHandler.name, () => {
  class TestHandler extends BaseHandler {
    readonly command = CommandEnum.Test
    readonly description = 'Test command'
    readonly events = {}
    async onCommand() {}

    // Expose protected methods for testing
    public async setSessionCommand(ctx: CustomContext) {
      await super.setSessionCommand(ctx)
    }

    public async resetSession(ctx: CustomContext) {
      await super.resetSession(ctx)
    }
  }

  it('should set session command correctly', async () => {
    const handler = new TestHandler()
    const ctx = {
      session: {
        command: null,
        params: null,
      },
    } as CustomContext

    await handler.setSessionCommand(ctx)

    expect(ctx.session.command).toBe(CommandEnum.Test)
  })

  it('should reset session correctly', async () => {
    const handler = new TestHandler()
    const ctx = {
      session: {
        command: CommandEnum.Test,
        params: { someParam: 'value' },
      },
    } as unknown as CustomContext

    await handler.resetSession(ctx)

    expect(ctx.session.command).toBeNull()
    expect(ctx.session.params).toBeNull()
  })
})

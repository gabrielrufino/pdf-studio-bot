import type { CustomContext } from '../types/custom-context.type'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { HelpMessage } from '../messages/help.message'
import { HelpHandler } from './help.handler'

describe(HelpHandler.name, () => {
  let handler: HelpHandler
  let ctx: CustomContext

  beforeEach(() => {
    handler = new HelpHandler()
    ctx = {
      reply: vi.fn(),
    } as unknown as CustomContext
  })

  it('should have correct command', () => {
    expect(handler.command).toBe(CommandEnum.Help)
  })

  describe(HelpHandler.prototype.onCommand.name, () => {
    it('should reply with help message', async () => {
      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith(new HelpMessage().build())
    })
  })
})

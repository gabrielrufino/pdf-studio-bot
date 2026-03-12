import type { CustomContext } from '../types/custom-context.type'
import type { BaseHandler } from './base.handler'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { HelpHandler } from './help.handler'

describe(HelpHandler.name, () => {
  const mockHandlers = [
    { command: 'download', description: 'Download a PDF from a URL' },
    { command: 'split', description: 'Split a PDF into individual pages' },
  ] as BaseHandler[]

  let handler: HelpHandler
  let ctx: CustomContext

  beforeEach(() => {
    handler = new HelpHandler(mockHandlers)
    ctx = {
      reply: vi.fn(),
    } as unknown as CustomContext
  })

  it('should have correct command', () => {
    expect(handler.command).toBe(CommandEnum.Help)
  })

  describe(HelpHandler.prototype.onCommand.name, () => {
    it('should reply with a dynamically generated help message', async () => {
      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('/download - Download a PDF from a URL'),
      )
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('/split - Split a PDF into individual pages'),
      )
    })
  })
})

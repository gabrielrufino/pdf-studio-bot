import type { CustomContext } from '../types/custom-context.type'
import type { BaseHandler } from './base.handler'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { HelpHandler } from './help.handler'

describe(HelpHandler.name, () => {
  const mockHandlers = [
    { command: 'download', description: '🌐 Download a PDF from a URL', onCommand: vi.fn() },
    { command: 'split', description: '✂️ Split a PDF into individual pages', onCommand: vi.fn() },
  ] as unknown as BaseHandler[]

  let handler: HelpHandler
  let ctx: CustomContext

  beforeEach(() => {
    handler = new HelpHandler(mockHandlers)
    ctx = {
      reply: vi.fn(),
      answerCallbackQuery: vi.fn(),
      callbackQuery: {
        data: 'download',
      },
    } as unknown as CustomContext
  })

  it('should have correct command', () => {
    expect(handler.command).toBe(CommandEnum.Help)
  })

  describe(HelpHandler.prototype.onCommand.name, () => {
    it('should reply with a dynamically generated help message', async () => {
      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith(
        'Please select an operation:',
        expect.objectContaining({
          reply_markup: expect.anything(),
        }),
      )
    })
  })

  describe('events', () => {
    it('should handle callback_query and call onCommand of the selected handler', async () => {
      const downloadHandler = mockHandlers[0]
      const onCommandSpy = vi.spyOn(downloadHandler, 'onCommand').mockResolvedValue(undefined)

      await handler.events.callback_query(ctx)

      expect(ctx.answerCallbackQuery).toHaveBeenCalled()
      expect(onCommandSpy).toHaveBeenCalledWith(ctx)
    })

    it('should not do anything if handler is not found', async () => {
      ctx.callbackQuery!.data = 'unknown'
      await handler.events.callback_query(ctx)

      expect(ctx.answerCallbackQuery).not.toHaveBeenCalled()
    })
  })
})

import type { CustomContext } from '../types/custom-context.type'
import { describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { InvalidFileError } from '../errors/invalid-file.error'
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

    public async validatePDF(ctx: CustomContext) {
      await super.validatePDF(ctx)
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

  describe('validatePDF', () => {
    it('should not throw if mime type is application/pdf', async () => {
      const handler = new TestHandler()
      const ctx = {
        message: {
          document: {
            mime_type: 'application/pdf',
          },
        },
      } as unknown as CustomContext

      await expect(handler.validatePDF(ctx)).resolves.not.toThrow()
    })

    it('should throw InvalidFileError and reply if mime type is not application/pdf', async () => {
      const handler = new TestHandler()
      const ctx = {
        message: {
          document: {
            mime_type: 'image/png',
          },
        },
        reply: vi.fn(),
      } as unknown as CustomContext

      await expect(handler.validatePDF(ctx)).rejects.toThrow(InvalidFileError)
      expect(ctx.reply).toHaveBeenCalledWith('⚠️ Please send only PDF files.')
    })

    it('should throw InvalidFileError and reply if document is missing', async () => {
      const handler = new TestHandler()
      const ctx = {
        message: {
          text: 'hello',
        },
        reply: vi.fn(),
      } as unknown as CustomContext

      await expect(handler.validatePDF(ctx)).rejects.toThrow(InvalidFileError)
      expect(ctx.reply).toHaveBeenCalledWith('⚠️ Please send only PDF files.')
    })
  })
})

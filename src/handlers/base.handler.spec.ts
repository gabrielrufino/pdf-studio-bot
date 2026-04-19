import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

  beforeEach(() => {
    vi.restoreAllMocks()
  })

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

  describe('removeTemporaryFiles', () => {
    it('should remove temporary file if path exists in params', async () => {
      const handler = new TestHandler()
      const ctx = {
        session: {
          command: CommandEnum.Test,
          params: { path: '/tmp/test-file' },
        },
      } as unknown as CustomContext

      const rmSpy = vi.spyOn(fs, 'rm').mockResolvedValue(undefined)

      await handler.resetSession(ctx)

      expect(rmSpy).toHaveBeenCalledWith('/tmp/test-file', { force: true, recursive: true })
    })

    it('should remove temporary files if paths exist in params', async () => {
      const handler = new TestHandler()
      const ctx = {
        session: {
          command: CommandEnum.Test,
          params: { paths: ['/tmp/file1', '/tmp/file2'] },
        },
      } as unknown as CustomContext

      const rmSpy = vi.spyOn(fs, 'rm').mockResolvedValue(undefined)

      await handler.resetSession(ctx)

      expect(rmSpy).toHaveBeenCalledWith('/tmp/file1', { force: true, recursive: true })
      expect(rmSpy).toHaveBeenCalledWith('/tmp/file2', { force: true, recursive: true })
    })

    it('should ignore non-string paths in paths array', async () => {
      const handler = new TestHandler()
      const ctx = {
        session: {
          command: CommandEnum.Test,
          params: { paths: ['/tmp/file1', 123, null] },
        },
      } as unknown as CustomContext

      const rmSpy = vi.spyOn(fs, 'rm').mockResolvedValue(undefined)

      await handler.resetSession(ctx)

      expect(rmSpy).toHaveBeenCalledTimes(1)
      expect(rmSpy).toHaveBeenCalledWith('/tmp/file1', { force: true, recursive: true })
    })

    it('should catch and log error if fs.rm fails', async () => {
      const handler = new TestHandler()
      const ctx = {
        session: {
          command: CommandEnum.Test,
          params: { path: '/tmp/test-file' },
        },
      } as unknown as CustomContext

      const error = new Error('Permission denied')
      const rmSpy = vi.spyOn(fs, 'rm').mockRejectedValue(error)
      const loggerSpy = vi.spyOn((handler as any).logger, 'error')

      await handler.resetSession(ctx)

      expect(rmSpy).toHaveBeenCalled()
      expect(loggerSpy).toHaveBeenCalledWith({ error, path: '/tmp/test-file' }, 'Failed to remove temporary file/folder.')
    })
  })
})

import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { InputFile } from 'grammy'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { SessionValidationError } from '../errors/session-validation.error'
import { PutPasswordHandler } from './put-password.handler'

vi.mock('../config/bot', () => ({
  bot: {
    api: {
      deleteMessage: vi.fn(),
    },
  },
}))

describe(PutPasswordHandler.name, () => {
  let handler: PutPasswordHandler
  let ctx: CustomContext
  let mockUserRepository: UserRepository

  beforeEach(() => {
    vi.clearAllMocks()
    mockUserRepository = {
      incrementUsage: vi.fn(),
    } as unknown as UserRepository

    handler = new PutPasswordHandler(mockUserRepository)
    ctx = {
      from: { id: 123 },
      session: {
        command: null,
        params: { path: null },
      },
      message: {
        text: 'password123',
        message_id: 1,
        document: {
          mime_type: 'application/pdf',
        },
      },
      chat: { id: 100 },
      getFile: vi.fn(),
      reply: vi.fn(),
      replyWithDocument: vi.fn().mockResolvedValue({}),
    } as unknown as CustomContext
  })

  it('should have correct command', () => {
    expect(handler.command).toBe(CommandEnum.PutPassword)
  })

  describe(PutPasswordHandler.prototype.onCommand.name, () => {
    it('should set session command and ask for file', async () => {
      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('📄 Please send the PDF file you want to protect with a password.')
      expect(ctx.session.command).toBe(CommandEnum.PutPassword)
      expect(ctx.session.params).toEqual({ path: null })
    })
  })

  describe('events', () => {
    describe('msg:document', () => {
      it('should download file and update session params', async () => {
        const filePath = '/tmp/test.pdf'
        vi.mocked(ctx.getFile).mockResolvedValueOnce({
          download: vi.fn().mockResolvedValue(filePath),
        } as any)

        await handler.events['msg:document'](ctx)

        expect(ctx.getFile).toHaveBeenCalled()
        expect(ctx.session.params).toEqual({ path: filePath })
        expect(ctx.reply).toHaveBeenCalledWith('🔑 File received! Now, please send the password you\'d like to use to protect it.')
      })

      it('should throw SessionValidationError if session is invalid', async () => {
        ctx.session.params = null

        await expect(handler.events['msg:document'](ctx)).rejects.toThrow(SessionValidationError)
      })
    })

    describe('msg:text', () => {
      it('should throw SessionValidationError if path is missing', async () => {
        ctx.session.params = { path: null }

        await expect(handler.events['msg:text'](ctx)).rejects.toThrow(SessionValidationError)
      })

      it('should send document with password applied', async () => {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-studio-bot-test-putpwd-'))
        const targetPath = path.join(tempDir, 'test.pdf')

        try {
          const assetPath = path.join(process.cwd(), 'assets/lorem-ipsum.pdf')
          await fs.copyFile(assetPath, targetPath)
          ctx.session.params = { path: targetPath }

          await handler.events['msg:text'](ctx)

          expect(ctx.reply).toHaveBeenCalledWith('🔒 Protecting your PDF file with the password...')
          expect(ctx.replyWithDocument).toHaveBeenCalledWith(expect.any(InputFile), {
            caption: '✅ Here is your password-protected PDF!',
          })
          expect(mockUserRepository.incrementUsage).toHaveBeenCalledWith(123)
          expect(ctx.session.command).toBeNull()
          expect(ctx.session.params).toBeNull()
        }
        finally {
          await fs.rm(tempDir, { recursive: true, force: true })
        }
      })

      it('should handle errors during password protection', async () => {
        ctx.session.params = { path: '/invalid/path' }
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')

        await handler.events['msg:text'](ctx)

        expect(loggerSpy).toHaveBeenCalled()
        expect(ctx.reply).toHaveBeenCalledWith('❌ An error occurred while putting a password on the PDF file.')
      })

      it('should log error if removing temporary directory fails', async () => {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-studio-bot-test-putpwd-err-'))
        const targetPath = path.join(tempDir, 'test.pdf')
        const assetPath = path.join(process.cwd(), 'assets/lorem-ipsum.pdf')
        await fs.copyFile(assetPath, targetPath)
        ctx.session.params = { path: targetPath }

        const fsPromises = await import('node:fs/promises')
        vi.spyOn(fsPromises.default, 'rm').mockRejectedValueOnce(new Error('rm failed'))
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')

        await handler.events['msg:text'](ctx)

        expect(loggerSpy).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(Error) }), expect.stringContaining('Failed to remove'))
      })
    })
  })
})

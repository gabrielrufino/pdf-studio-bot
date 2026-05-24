import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { InputFile } from 'grammy'
import { Recipe } from 'muhammara'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { SessionValidationError } from '../errors/session-validation.error'
import { RemovePasswordHandler } from './remove-password.handler'

describe(RemovePasswordHandler.name, () => {
  let handler: RemovePasswordHandler
  let ctx: CustomContext
  let mockUserRepository: UserRepository

  beforeEach(() => {
    vi.clearAllMocks()
    mockUserRepository = {
      incrementUsage: vi.fn(),
    } as unknown as UserRepository

    handler = new RemovePasswordHandler(mockUserRepository)
    ctx = { t: (key: string) => key, from: { id: 123 }, session: {
      command: null,
      params: { path: null },
    }, message: {
      text: 'password123',
      message_id: 1,
      document: {
        mime_type: 'application/pdf',
      },
    }, chat: { id: 100 }, getFile: vi.fn(), reply: vi.fn(), replyWithDocument: vi.fn().mockResolvedValue({}), deleteMessage: vi.fn().mockResolvedValue(true) } as unknown as CustomContext
  })

  it('should have correct command', () => {
    expect(handler.command).toBe(CommandEnum.RemovePassword)
  })

  describe(RemovePasswordHandler.prototype.onCommand.name, () => {
    it('should set session command and ask for file', async () => {
      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('removepassword_send_file')
      expect(ctx.session.command).toBe(CommandEnum.RemovePassword)
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
        expect(ctx.reply).toHaveBeenCalledWith('removepassword_send_password')
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

      it('should send document with password removed', async () => {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-studio-bot-test-rempwd-'))
        const inputPath = path.join(tempDir, 'input.pdf')

        try {
          // Create an encrypted PDF
          const assetPath = path.join(process.cwd(), 'assets/lorem-ipsum.pdf')
          await new Promise((resolve, reject) => {
            new Recipe(assetPath, inputPath)
              .encrypt({ userPassword: 'password123', ownerPassword: 'password123' })
              .endPDF((err?: Error) => {
                if (err) {
                  return reject(err)
                }

                resolve(null)
              })
          })

          ctx.session.params = { path: inputPath }
          ctx.message!.text = 'password123'

          await handler.events['msg:text'](ctx)

          expect(ctx.reply).toHaveBeenCalledWith('removepassword_removing')
          expect(ctx.replyWithDocument).toHaveBeenCalledWith(expect.any(InputFile), {
            caption: 'removepassword_success',
          })
          expect(mockUserRepository.incrementUsage).toHaveBeenCalledWith(123)
          expect(ctx.session.command).toBeNull()
          expect(ctx.session.params).toBeNull()
        }
        finally {
          await fs.rm(tempDir, { recursive: true, force: true })
        }
      })

      it('should handle incorrect password', async () => {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-studio-bot-test-rempwd-fail-'))
        const inputPath = path.join(tempDir, 'input.pdf')

        try {
          // Create an encrypted PDF
          const assetPath = path.join(process.cwd(), 'assets/lorem-ipsum.pdf')
          await new Promise((resolve, reject) => {
            new Recipe(assetPath, inputPath)
              .encrypt({ userPassword: 'password123', ownerPassword: 'password123' })
              .endPDF((err?: Error) => {
                if (err) {
                  return reject(err)
                }

                resolve(null)
              })
          })

          ctx.session.params = { path: inputPath }
          ctx.message!.text = 'wrong_password'

          await handler.events['msg:text'](ctx)

          expect(ctx.reply).toHaveBeenCalledWith('removepassword_error')
        }
        finally {
          await fs.rm(tempDir, { recursive: true, force: true })
        }
      })

      it('should handle errors during password removal', async () => {
        ctx.session.params = { path: '/invalid/path' }
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')

        await handler.events['msg:text'](ctx)

        expect(loggerSpy).toHaveBeenCalled()
        expect(ctx.reply).toHaveBeenCalledWith('removepassword_error')
      })
    })
  })
})

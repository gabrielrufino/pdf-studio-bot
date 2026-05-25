import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { InputFile } from 'grammy'
import { Recipe } from 'muhammara'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { createMockContext, createMockUserRepository } from './password-test.util'
import { RemovePasswordHandler } from './remove-password.handler'

describe(RemovePasswordHandler.name, () => {
  let handler: RemovePasswordHandler
  let ctx: CustomContext
  const mockUserRepository = createMockUserRepository()

  beforeEach(() => {
    vi.clearAllMocks()
    handler = new RemovePasswordHandler(mockUserRepository)
    ctx = createMockContext()
  })

  it('should have correct command', () => {
    expect(handler.command).toBe(CommandEnum.RemovePassword)
  })

  describe('onCommand', () => {
    it('should set session command and ask for file', async () => {
      await handler.onCommand(ctx)
      expect(ctx.reply).toHaveBeenCalledWith('removepassword_send_file')
      expect(ctx.session.command).toBe(CommandEnum.RemovePassword)
      expect(ctx.session.params).toEqual({ path: null })
    })
  })

  describe('events', () => {
    it('should download file on msg:document', async () => {
      const filePath = '/tmp/test.pdf'
      vi.mocked(ctx.getFile).mockResolvedValueOnce({
        download: vi.fn().mockResolvedValue(filePath),
      } as any)
      await handler.events['msg:document'](ctx)
      expect(ctx.session.params).toEqual({ path: filePath })
      expect(ctx.reply).toHaveBeenCalledWith('removepassword_send_password')
    })

    it('should remove password on msg:text', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-studio-bot-test-rempwd-'))
      const inputPath = path.join(tempDir, 'input.pdf')
      try {
        await new Promise((resolve, reject) => {
          new Recipe(path.join(process.cwd(), 'assets/lorem-ipsum.pdf'), inputPath)
            .encrypt({ userPassword: 'password123', ownerPassword: 'password123' })
            .endPDF((err?: Error) => err ? reject(err) : resolve(null))
        })
        ctx.session.params = { path: inputPath }
        await handler.events['msg:text'](ctx)
        expect(ctx.reply).toHaveBeenCalledWith('removepassword_processing')
        expect(ctx.replyWithDocument).toHaveBeenCalledWith(expect.any(InputFile), { caption: 'removepassword_success' })
      }
      finally {
        await fs.rm(tempDir, { recursive: true, force: true })
      }
    })

    it('should handle errors and keep session for retry', async () => {
      const inputPath = '/invalid'
      ctx.session.params = { path: inputPath }
      ctx.session.command = CommandEnum.RemovePassword

      await handler.events['msg:text'](ctx)

      expect(ctx.reply).toHaveBeenCalledWith('removepassword_error')
      // Session should NOT be reset
      expect(ctx.session.command).toBe(CommandEnum.RemovePassword)
      expect(ctx.session.params.path).toBe(inputPath)
    })

    it('should allow successful retry after failure', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-studio-bot-test-rempwd-retry-'))
      const inputPath = path.join(tempDir, 'input.pdf')
      try {
        await new Promise((resolve, reject) => {
          new Recipe(path.join(process.cwd(), 'assets/lorem-ipsum.pdf'), inputPath)
            .encrypt({ userPassword: 'correct_password', ownerPassword: 'correct_password' })
            .endPDF((err?: Error) => err ? reject(err) : resolve(null))
        })

        ctx.session.params = { path: inputPath }
        ctx.session.command = CommandEnum.RemovePassword

        // 1. First attempt with wrong password
        ctx.message!.text = 'wrong_password'
        await handler.events['msg:text'](ctx)
        expect(ctx.reply).toHaveBeenCalledWith('removepassword_error')
        expect(ctx.session.command).toBe(CommandEnum.RemovePassword)

        // 2. Second attempt with correct password
        ctx.message!.text = 'correct_password'
        await handler.events['msg:text'](ctx)

        expect(ctx.replyWithDocument).toHaveBeenCalledWith(expect.any(InputFile), { caption: 'removepassword_success' })
        // Session should be reset after success
        expect(ctx.session.command).toBeNull()
        expect(ctx.session.params).toBeNull()
      }
      finally {
        await fs.rm(tempDir, { recursive: true, force: true })
      }
    })
  })
})

import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { InputFile } from 'grammy'
import { Recipe } from 'muhammara'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { createMockContext, createMockUserRepository, testPasswordBaseHandlerBehavior } from './password-test.util'
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

  testPasswordBaseHandlerBehavior(() => handler, () => ctx, CommandEnum.RemovePassword, 'removepassword')

  describe('events', () => {
    it('should remove password on msg:text', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-studio-bot-test-rempwd-'))
      const inputPath = path.join(tempDir, 'input.pdf')
      try {
        await new Promise((resolve, reject) => {
          new Recipe(path.join(process.cwd(), 'assets/lorem-ipsum.pdf'), inputPath)
            .encrypt({ userPassword: 'password123', ownerPassword: 'password123' })
            .endPDF((err?: Error) => {
              if (err) {
                return reject(err)
              }
              resolve(null)
            })
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

    it('should allow successful retry after failure', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-studio-bot-test-rempwd-retry-'))
      const inputPath = path.join(tempDir, 'input.pdf')
      try {
        await new Promise((resolve, reject) => {
          new Recipe(path.join(process.cwd(), 'assets/lorem-ipsum.pdf'), inputPath)
            .encrypt({ userPassword: 'correct_password', ownerPassword: 'correct_password' })
            .endPDF((err?: Error) => {
              if (err) {
                return reject(err)
              }
              resolve(null)
            })
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

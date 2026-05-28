import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import { InputFile } from 'grammy'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { createEncryptedTestPdf, createMockContext, createMockUserRepository, testPasswordBaseHandlerBehavior } from './password-test.util'
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
      const { tempDir, filePath } = await createEncryptedTestPdf('rempwd')
      try {
        ctx.session.params = { path: filePath }
        await handler.events['msg:text'](ctx)
        expect(ctx.reply).toHaveBeenCalledWith('removepassword_processing')
        expect(ctx.replyWithDocument).toHaveBeenCalledWith(expect.any(InputFile), { caption: 'removepassword_success' })
      }
      finally {
        await fs.rm(tempDir, { recursive: true, force: true })
      }
    })

    it('should allow successful retry after failure', async () => {
      const { tempDir, filePath } = await createEncryptedTestPdf('rempwd-retry', 'correct_password')
      try {
        ctx.session.params = { path: filePath }
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

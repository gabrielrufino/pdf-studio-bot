import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import { InputFile } from 'grammy'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { createMockContext, createMockUserRepository, createTestPdf, testPasswordBaseHandlerBehavior } from './password-test.util'
import { PutPasswordHandler } from './put-password.handler'

describe(PutPasswordHandler.name, () => {
  let handler: PutPasswordHandler
  let ctx: CustomContext
  const mockUserRepository = createMockUserRepository()

  beforeEach(() => {
    vi.clearAllMocks()
    handler = new PutPasswordHandler(mockUserRepository)
    ctx = createMockContext()
  })

  testPasswordBaseHandlerBehavior(() => handler, () => ctx, CommandEnum.PutPassword, 'putpassword')

  describe('events', () => {
    it('should protect PDF on msg:text', async () => {
      const { tempDir, filePath } = await createTestPdf('putpwd')
      try {
        ctx.session.params = { path: filePath }
        await handler.events['msg:text'](ctx)
        expect(ctx.reply).toHaveBeenCalledWith('putpassword_processing')
        expect(ctx.replyWithDocument).toHaveBeenCalledWith(expect.any(InputFile), { caption: 'putpassword_success' })
      }
      finally {
        await fs.rm(tempDir, { recursive: true, force: true })
      }
    })
  })
})

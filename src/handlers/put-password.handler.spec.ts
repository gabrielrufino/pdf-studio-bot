import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { InputFile } from 'grammy'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { createMockContext, createMockUserRepository, testPasswordBaseHandlerBehavior } from './password-test.util'
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
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-studio-bot-test-putpwd-'))
      const targetPath = path.join(tempDir, 'test.pdf')
      try {
        await fs.copyFile(path.join(process.cwd(), 'assets/lorem-ipsum.pdf'), targetPath)
        ctx.session.params = { path: targetPath }
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

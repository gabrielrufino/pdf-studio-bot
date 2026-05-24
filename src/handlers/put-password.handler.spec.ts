import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { InputFile } from 'grammy'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { createMockContext, createMockUserRepository } from './password-test.util'
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

  it('should have correct command', () => {
    expect(handler.command).toBe(CommandEnum.PutPassword)
  })

  describe('onCommand', () => {
    it('should set session command and ask for file', async () => {
      await handler.onCommand(ctx)
      expect(ctx.reply).toHaveBeenCalledWith('putpassword_send_file')
      expect(ctx.session.command).toBe(CommandEnum.PutPassword)
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
      expect(ctx.reply).toHaveBeenCalledWith('putpassword_send_password')
    })

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

    it('should handle errors', async () => {
      ctx.session.params = { path: '/invalid' }
      await handler.events['msg:text'](ctx)
      expect(ctx.reply).toHaveBeenCalledWith('putpassword_error')
    })
  })
})

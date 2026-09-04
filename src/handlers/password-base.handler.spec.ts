import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import { InputFile } from 'grammy'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { PasswordBaseHandler } from './password-base.handler'

class TestPasswordHandler extends PasswordBaseHandler {
  protected get prefix(): string {
    return 'test'
  }

  protected async processPDF(input: string, output: string, password?: string): Promise<void> {
    if (password === 'fail')
      throw new Error('Processing failed')
    await fs.writeFile(output, 'test content')
  }

  readonly command = CommandEnum.Help // dummy
  readonly description = 'Test'
}

describe(PasswordBaseHandler.name, () => {
  let handler: TestPasswordHandler
  let ctx: CustomContext
  let mockUserRepository: UserRepository

  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(fs, 'rm').mockResolvedValue(undefined)
    vi.spyOn(fs, 'mkdtemp').mockResolvedValue('/tmp/pdf-studio-bot-test-')
    vi.spyOn(fs, 'chmod').mockResolvedValue(undefined)
    vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined)

    mockUserRepository = {
      incrementUsage: vi.fn(),
    } as unknown as UserRepository

    handler = new TestPasswordHandler(mockUserRepository)
    ctx = {
      t: (key: string) => key,
      from: { id: 123 },
      session: {
        command: null,
        params: { path: null },
      },
      message: { document: { mime_type: 'application/pdf' } },
      reply: vi.fn(),
      replyWithDocument: vi.fn(),
      deleteMessage: vi.fn().mockResolvedValue(true),
      getFile: vi.fn().mockResolvedValue({
        download: vi.fn().mockResolvedValue('/tmp/downloaded.pdf'),
      }),
    } as unknown as CustomContext
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('onCommand', () => {
    it('should set session command and ask for file', async () => {
      await handler.onCommand(ctx)
      expect(ctx.reply).toHaveBeenCalledWith('test_send_file')
      expect(ctx.session.params).toEqual({ path: null })
    })
  })

  describe('events', () => {
    describe('msg:document', () => {
      it('should save document path and ask for password', async () => {
        await handler.events['msg:document'](ctx)
        expect((ctx.session.params as any)?.path).toBe('/tmp/downloaded.pdf')
        expect(ctx.reply).toHaveBeenCalledWith('test_send_password')
      })

      it('should remove previous temporary file if it exists', async () => {
        ctx.session.params = { path: '/tmp/old.pdf' }
        await handler.events['msg:document'](ctx)
        expect(fs.rm).toHaveBeenCalledWith('/tmp/old.pdf', expect.any(Object))
      })

      it('should handle fs.rm error silently', async () => {
        ctx.session.params = { path: '/tmp/old.pdf' }
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')
        vi.spyOn(fs, 'rm').mockRejectedValueOnce(new Error('rm failed'))
        await handler.events['msg:document'](ctx)
        expect(loggerSpy).toHaveBeenCalled()
        expect(ctx.reply).toHaveBeenCalledWith('test_send_password')
      })
    })

    describe('msg:text', () => {
      it('should ask for file if path is not in session', async () => {
        ctx.session.params = { path: null }
        await handler.events['msg:text'](ctx)
        expect(ctx.reply).toHaveBeenCalledWith('test_send_file')
      })

      it('should process PDF and reply with document', async () => {
        ctx.session.params = { path: '/tmp/input.pdf' }
        Object.defineProperty(ctx, 'message', { value: { text: 'mypassword' }, writable: true })
        await handler.events['msg:text'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('test_processing')
        expect(ctx.deleteMessage).toHaveBeenCalled()
        expect(fs.mkdtemp).toHaveBeenCalled()
        expect(fs.chmod).toHaveBeenCalled()
        expect(ctx.replyWithDocument).toHaveBeenCalledWith(expect.any(InputFile), { caption: 'test_success' })
        expect(mockUserRepository.incrementUsage).toHaveBeenCalledWith(123)
        expect(fs.rm).toHaveBeenCalledWith('/tmp/input.pdf', expect.any(Object))
        expect(fs.rm).toHaveBeenCalledWith('/tmp/pdf-studio-bot-test-', expect.any(Object))
      })

      it('should handle processPDF error and reply with error', async () => {
        ctx.session.params = { path: '/tmp/input.pdf' }
        Object.defineProperty(ctx, 'message', { value: { text: 'fail' }, writable: true })
        await handler.events['msg:text'](ctx)
        expect(ctx.reply).toHaveBeenCalledWith('test_error')
      })

      it('should handle outputDir fs.rm error silently in finally block', async () => {
        ctx.session.params = { path: '/tmp/input.pdf' }
        Object.defineProperty(ctx, 'message', { value: { text: 'mypassword' }, writable: true })

        vi.spyOn(fs, 'rm').mockImplementation(async (path: any) => {
          if (path === '/tmp/pdf-studio-bot-test-')
            throw new Error('rm error')
        })

        const loggerSpy = vi.spyOn((handler as any).logger, 'error')
        await handler.events['msg:text'](ctx)
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.objectContaining({ error: expect.any(Error) }),
          'Failed to remove temporary directory.',
        )
      })

      it('should handle ctx.deleteMessage error silently', async () => {
        ctx.session.params = { path: '/tmp/input.pdf' }
        Object.defineProperty(ctx, 'message', { value: { text: 'mypassword' }, writable: true })
        vi.mocked(ctx.deleteMessage).mockRejectedValueOnce(new Error('delete failed'))
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')
        await handler.events['msg:text'](ctx)
        expect(loggerSpy).toHaveBeenCalledWith(expect.any(Error), 'Failed to delete message.')
        expect(ctx.replyWithDocument).toHaveBeenCalled()
      })

      it('should handle input fs.rm error silently', async () => {
        ctx.session.params = { path: '/tmp/input.pdf' }
        Object.defineProperty(ctx, 'message', { value: { text: 'mypassword' }, writable: true })
        vi.spyOn(fs, 'rm').mockImplementation(async (path: any) => {
          if (path === '/tmp/input.pdf')
            throw new Error('rm input error')
        })
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')
        await handler.events['msg:text'](ctx)
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.objectContaining({ error: expect.any(Error) }),
          'Failed to remove temporary input file.',
        )
        expect(ctx.replyWithDocument).toHaveBeenCalled()
      })
    })
  })
})

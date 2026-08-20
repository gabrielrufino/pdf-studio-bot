import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { SplitHandler } from './split.handler'

describe(SplitHandler.name, () => {
  let handler: SplitHandler
  let mockUserRepository: UserRepository

  let ctx: CustomContext

  beforeEach(() => {
    vi.restoreAllMocks()
    mockUserRepository = {
      findByTelegramId: vi.fn().mockResolvedValue({ plan_type: 'free' }),
      incrementUsage: vi.fn(),
    } as unknown as UserRepository
    handler = new SplitHandler(mockUserRepository)
    ctx = { t: (key: string) => key, from: { id: 123 }, user: { plan_type: 'free' }, session: {
      command: null,
      params: {} as any,
    }, message: {
      document: {
        mime_type: 'application/pdf',
      },
    }, getFile: vi.fn().mockResolvedValue({
      download: vi.fn().mockResolvedValue('/tmp/fake.pdf'),
    }), reply: vi.fn(), replyWithDocument: vi.fn() } as unknown as CustomContext
  })

  it('should have correct command', () => {
    expect(handler.command).toBe(CommandEnum.Split)
  })

  describe(SplitHandler.prototype.onCommand.name, () => {
    it('should set session command and ask for PDF file', async () => {
      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('split_send_file')
      expect(ctx.session.command).toBe(CommandEnum.Split)
    })
  })

  describe('events', () => {
    describe('msg:document', () => {
      it('should split PDF into individual pages and send them', async () => {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-studio-bot-test-split-'))
        const targetPath = path.join(tempDir, 'test.pdf')

        try {
          await fs.copyFile(`${process.cwd()}/assets/lorem-ipsum.pdf`, targetPath)
          vi.mocked(ctx.getFile).mockResolvedValueOnce({
            download: vi.fn().mockResolvedValue(targetPath),
          } as any)

          await handler.events['msg:document'](ctx)

          expect(ctx.getFile).toHaveBeenCalled()
          expect(ctx.reply).toHaveBeenCalledWith('split_splitting')
          expect(mockUserRepository.incrementUsage).toHaveBeenCalledWith(123)

          for (let i = 0; i < 10; i++) {
            expect(ctx.replyWithDocument).toHaveBeenCalledWith(
              expect.objectContaining({
                filename: `page-${i + 1}.pdf`,
              }),
              {
                caption: `📄 Page ${i + 1} of 10`,
              },
            )
          }
        }
        finally {
          await fs.rm(tempDir, { recursive: true, force: true })
        }
      })

      it('should handle errors during splitting', async () => {
        vi.mocked(ctx.getFile).mockRejectedValue(new Error('Download failed'))
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')

        await handler.events['msg:document'](ctx)

        expect(loggerSpy).toHaveBeenCalled()
        expect(ctx.reply).toHaveBeenCalledWith('split_error')
      })

      it('should log error if fs.rm fails to remove temporary folder', async () => {
        const error = new Error('Directory delete failed')
        const fakeOutputDir = '/tmp/fake-output-dir'

        const mkdtempSpy = vi.spyOn(fs, 'mkdtemp').mockResolvedValue(fakeOutputDir)
        const chmodSpy = vi.spyOn(fs, 'chmod').mockResolvedValue(undefined)
        vi.mocked(ctx.getFile).mockRejectedValue(new Error('Download failed'))

        const rmSpy = vi.spyOn(fs, 'rm').mockRejectedValue(error)
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')

        await handler.events['msg:document'](ctx)

        expect(rmSpy).toHaveBeenCalledWith(fakeOutputDir, { force: true, recursive: true })
        expect(loggerSpy).toHaveBeenCalledWith({ error, path: fakeOutputDir }, 'Failed to remove temporary folder.')

        mkdtempSpy.mockRestore()
        chmodSpy.mockRestore()
        rmSpy.mockRestore()
      })

      it('should log error if fs.rm fails in finally block', async () => {
        const error = new Error('Delete failed')
        const rmSpy = vi.spyOn(fs, 'rm').mockRejectedValue(error)
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')

        // To reach finally block with a path, we need to let the try block run a bit or mock it
        // But since we want to test both outputDir and inputPath removal failures:
        // We'll mock getFile to return a path, then make fs.rm fail.
        vi.mocked(ctx.getFile).mockResolvedValue({
          download: vi.fn().mockResolvedValue('/tmp/fake-input.pdf'),
        } as any)

        await handler.events['msg:document'](ctx)

        expect(rmSpy).toHaveBeenCalled()
        expect(loggerSpy).toHaveBeenCalledWith({ error, path: '/tmp/fake-input.pdf' }, 'Failed to remove input file.')
        rmSpy.mockRestore()
      })

      it('should throw error if download fails (inputPath is null)', async () => {
        vi.mocked(ctx.getFile).mockResolvedValueOnce({
          download: vi.fn().mockResolvedValue(null),
        } as any)
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')

        await handler.events['msg:document'](ctx)

        expect(loggerSpy).toHaveBeenCalledWith(new Error('Failed to download file'))
        expect(ctx.reply).toHaveBeenCalledWith('split_error')
      })

      it('should notify limit exceeded and not reply with split_error when file size limit exceeded', async () => {
        ctx.message!.document!.file_size = 20 * 1024 * 1024 // 20MB > 10MB free limit
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')

        await handler.events['msg:document'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('free_limit_reached')
        expect(ctx.reply).not.toHaveBeenCalledWith('split_error')
        expect(loggerSpy).not.toHaveBeenCalled()
        expect(ctx.getFile).not.toHaveBeenCalled()
      })

      it('should notify limit exceeded and not reply with split_error when page limit exceeded', async () => {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-studio-bot-test-split-limit-'))
        const targetPath = path.join(tempDir, 'test.pdf')

        try {
          await fs.copyFile(`${process.cwd()}/assets/lorem-ipsum.pdf`, targetPath)
          vi.mocked(ctx.getFile).mockResolvedValueOnce({
            download: vi.fn().mockResolvedValue(targetPath),
          } as any)

          const muhammara = await import('muhammara')
          const createReaderSpy = vi.spyOn(muhammara.default, 'createReader').mockReturnValueOnce({
            getPagesCount: () => 51,
          } as any)
          const loggerSpy = vi.spyOn((handler as any).logger, 'error')

          await handler.events['msg:document'](ctx)

          expect(ctx.reply).toHaveBeenCalledWith('free_limit_reached')
          expect(ctx.reply).not.toHaveBeenCalledWith('split_error')
          expect(loggerSpy).not.toHaveBeenCalled()

          createReaderSpy.mockRestore()
        }
        finally {
          await fs.rm(tempDir, { recursive: true, force: true })
        }
      })

      it('should not reply with generic error if file is not a PDF (InvalidFileError)', async () => {
        ctx.message!.document!.mime_type = 'image/png'

        await handler.events['msg:document'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('invalid_pdf')
        expect(ctx.reply).not.toHaveBeenCalledWith('split_error')
        expect(ctx.session.command).toBeNull()
      })
    })
  })
})

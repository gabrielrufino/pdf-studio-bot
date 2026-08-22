import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { ExtractHandler } from './extract.handler'

describe(ExtractHandler.name, () => {
  let handler: ExtractHandler
  let mockUserRepository: UserRepository

  let ctx: CustomContext

  beforeEach(() => {
    vi.restoreAllMocks()
    mockUserRepository = {
      findByTelegramId: vi.fn().mockResolvedValue({ plan_type: 'free' }),
      incrementUsage: vi.fn(),
    } as unknown as UserRepository
    handler = new ExtractHandler(mockUserRepository)
    ctx = {
      t: (key: string) => key,
      from: { id: 123 },
      user: { plan_type: 'free' },
      session: {
        command: null,
        params: { path: null } as any,
      },
      message: {
        document: {
          mime_type: 'application/pdf',
          file_size: 1024,
        },
      } as any,
      getFile: vi.fn().mockResolvedValue({
        download: vi.fn().mockResolvedValue('/tmp/fake.pdf'),
      }),
      reply: vi.fn(),
      replyWithDocument: vi.fn(),
    } as unknown as CustomContext
  })

  it('should have correct command', () => {
    expect(handler.command).toBe(CommandEnum.Extract)
  })

  describe('onCommand', () => {
    it('should set session command and ask for PDF file', async () => {
      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('extract_send_file')
      expect(ctx.session.command).toBe(CommandEnum.Extract)
      expect(ctx.session.params).toEqual({ path: null })
    })
  })

  describe('events', () => {
    describe('msg:document', () => {
      it('should save downloaded file path and ask for range', async () => {
        vi.mocked(ctx.getFile).mockResolvedValueOnce({
          download: vi.fn().mockResolvedValue('/tmp/fake.pdf'),
        } as any)

        await handler.events['msg:document'](ctx)

        expect(ctx.getFile).toHaveBeenCalled()
        expect((ctx.session.params as any).path).toBe('/tmp/fake.pdf')
        expect(ctx.reply).toHaveBeenCalledWith('extract_send_range')
      })

      it('should handle missing download path', async () => {
        vi.mocked(ctx.getFile).mockResolvedValueOnce({
          download: vi.fn().mockResolvedValue(null),
        } as any)

        const loggerSpy = vi.spyOn((handler as any).logger, 'error')

        await handler.events['msg:document'](ctx)

        expect(loggerSpy).toHaveBeenCalledWith(new Error('Failed to download file'))
        expect(ctx.reply).toHaveBeenCalledWith('extract_error')
      })
    })

    describe('msg:text', () => {
      beforeEach(() => {
        ;(ctx.session.params as any).path = '/tmp/fake.pdf'
      })

      it('should ask for file if no path in session', async () => {
        ;(ctx.session.params as any).path = null
        await handler.events['msg:text'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('extract_send_file')
      })

      it('should reject invalid format', async () => {
        Object.defineProperty(ctx, 'message', { value: { text: 'invalid format' } })
        await handler.events['msg:text'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('extract_invalid_range')
      })

      it('should reject reverse range', async () => {
        Object.defineProperty(ctx, 'message', { value: { text: '5-1' } })
        await handler.events['msg:text'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('extract_invalid_range')
      })

      it('should extract pages and send the file', async () => {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-studio-bot-test-extract-'))
        const targetPath = path.join(tempDir, 'test.pdf')

        try {
          await fs.copyFile(`${process.cwd()}/assets/lorem-ipsum.pdf`, targetPath)
          ;(ctx.session.params as any).path = targetPath
          Object.defineProperty(ctx, 'message', { value: { text: '1-3' } })

          const muhammara = await import('muhammara')
          const mockAppend = vi.fn()
          const spyWriter = vi.spyOn(muhammara.default, 'createWriter').mockReturnValue({
            createPDFCopyingContext: () => ({ appendPDFPageFromPDF: mockAppend }),
            end: vi.fn(),
          } as any)

          await handler.events['msg:text'](ctx)

          expect(ctx.reply).toHaveBeenCalledWith('extract_extracting')
          expect(mockAppend).toHaveBeenCalledTimes(3)
          expect(mockAppend).toHaveBeenNthCalledWith(1, 0)
          expect(mockAppend).toHaveBeenNthCalledWith(2, 1)
          expect(mockAppend).toHaveBeenNthCalledWith(3, 2)
          expect(ctx.replyWithDocument).toHaveBeenCalledWith(
            expect.objectContaining({ filename: 'extracted-1-3.pdf' }),
            { caption: 'extract_success' }
          )
          expect(mockUserRepository.incrementUsage).toHaveBeenCalledWith(123)

          spyWriter.mockRestore()
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true })
        }
      })
      it('should log error if fs.rm fails in finally block for inputPath', async () => {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-studio-bot-test-extract-rm-'))
        const targetPath = path.join(tempDir, 'test.pdf')

        try {
          await fs.copyFile(`${process.cwd()}/assets/lorem-ipsum.pdf`, targetPath)
          ;(ctx.session.params as any).path = targetPath
          Object.defineProperty(ctx, 'message', { value: { text: '1-3' } })

          const rmSpy = vi.spyOn(fs, 'rm').mockImplementation(async (filePath) => {
            if (filePath === targetPath) throw new Error('Delete failed')
            return undefined
          })
          const loggerSpy = vi.spyOn((handler as any).logger, 'error')

          await handler.events['msg:text'](ctx)

          expect(loggerSpy).toHaveBeenCalledWith({ error: expect.any(Error), path: targetPath }, 'Failed to remove input file.')
          rmSpy.mockRestore()
        }
        finally {
          await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
        }
      })

      it('should log error if fs.rm fails in finally block for outputPath', async () => {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-studio-bot-test-extract-rm-out-'))
        const targetPath = path.join(tempDir, 'test.pdf')

        try {
          await fs.copyFile(`${process.cwd()}/assets/lorem-ipsum.pdf`, targetPath)
          ;(ctx.session.params as any).path = targetPath
          Object.defineProperty(ctx, 'message', { value: { text: '1-3' } })

          const rmSpy = vi.spyOn(fs, 'rm').mockImplementation(async (filePath) => {
            if (typeof filePath === 'string' && filePath.includes('extract-')) throw new Error('Delete failed')
            return undefined
          })
          const loggerSpy = vi.spyOn((handler as any).logger, 'error')

          await handler.events['msg:text'](ctx)

          expect(loggerSpy).toHaveBeenCalledWith({ error: expect.any(Error), path: expect.any(String) }, 'Failed to remove output file.')
          expect(rmSpy).toHaveBeenCalledWith(expect.any(String), { force: true, recursive: true })
          rmSpy.mockRestore()
        }
        finally {
          await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
        }
      })

      it('should log error and reply with extract_error if generic error occurs in msg:text', async () => {
        ;(ctx.session.params as any).path = '/tmp/fake.pdf'
        Object.defineProperty(ctx, 'message', { value: { text: '1-3' } })
        
        // Mock muhammara to throw
        const muhammara = await import('muhammara')
        const spy = vi.spyOn(muhammara.default, 'createReader').mockImplementation(() => {
          throw new Error('Fake error')
        })
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')

        await handler.events['msg:text'](ctx)

        expect(loggerSpy).toHaveBeenCalledWith(new Error('Fake error'))
        expect(ctx.reply).toHaveBeenCalledWith('extract_error')
        spy.mockRestore()
      })
    })

    describe('errors', () => {
      it('should notify limit exceeded and not reply with extract_error when file size limit exceeded', async () => {
        ctx.message!.document!.file_size = 20 * 1024 * 1024 // 20MB
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')

        await handler.events['msg:document'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('free_limit_reached')
        expect(ctx.reply).not.toHaveBeenCalledWith('extract_error')
        expect(loggerSpy).not.toHaveBeenCalled()
        expect(ctx.getFile).not.toHaveBeenCalled()
      })

      it('should not reply with generic error if file is not a PDF', async () => {
        ctx.message!.document!.mime_type = 'image/png'

        await handler.events['msg:document'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('invalid_pdf')
        expect(ctx.reply).not.toHaveBeenCalledWith('extract_error')
      })
    })
  })
})

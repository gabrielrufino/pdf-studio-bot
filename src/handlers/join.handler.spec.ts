import type { UserRepository } from '../repositories/user.repository'
import type { JoinParams } from '../schemas/join-params.schema'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { InvalidFileError } from '../errors/invalid-file.error'
import { SessionValidationError } from '../errors/session-validation.error'
import { JoinHandler } from './join.handler'

describe(JoinHandler.name, () => {
  let handler: JoinHandler
  let mockUserRepository: UserRepository

  let ctx: CustomContext

  beforeEach(() => {
    vi.clearAllMocks()
    mockUserRepository = {
      incrementUsage: vi.fn(),
    } as unknown as UserRepository

    handler = new JoinHandler(mockUserRepository)
    ctx = { t: (key: string) => key,
      from: { id: 123 },
      session: {
        command: null,
        params: { paths: [] } as JoinParams,
      },
      message: {
        text: '',
        document: {
          mime_type: 'application/pdf',
          file_name: 'test.pdf',
        },
      },
      getFile: vi.fn(),
      reply: vi.fn(),
      replyWithDocument: vi.fn(),
    } as unknown as CustomContext
  })

  it('should have correct command', () => {
    expect(handler.command).toBe(CommandEnum.Join)
  })

  describe(JoinHandler.prototype.onCommand.name, () => {
    it('should set session command and ask for PDF files', async () => {
      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith(
        'join_send_files',
      )
      expect(ctx.session.command).toBe(CommandEnum.Join)
      expect(ctx.session.params).toEqual({ paths: [] })
    })
  })

  describe('events', () => {
    describe('msg:document', () => {
      it('should add file path to session params', async () => {
        const filePath = '/tmp/file.pdf'
        vi.mocked(ctx.getFile).mockResolvedValueOnce({
          download: vi.fn().mockResolvedValue(filePath),
        } as any)

        await handler.events['msg:document'](ctx)

        expect(ctx.getFile).toHaveBeenCalled()
        expect((ctx.session.params as JoinParams).paths).toContain(filePath)
        expect(ctx.reply).toHaveBeenCalledWith('join_file_received')
      })

      it('should throw SessionValidationError if session is invalid', async () => {
        ctx.session.params = null

        await expect(handler.events['msg:document'](ctx)).rejects.toThrow(SessionValidationError)
      })
    })

    describe('msg:document (limit reached)', () => {
      it('should not add file path and notify user if limit reached', async () => {
        ; (ctx.session.params as JoinParams).paths = Array.from({ length: JoinHandler.MAX_PDF_FILES }, (_, i) => `/tmp/file-${i}.pdf`)

        await handler.events['msg:document'](ctx)

        expect(ctx.getFile).not.toHaveBeenCalled()
        expect((ctx.session.params as JoinParams).paths.length).toBe(JoinHandler.MAX_PDF_FILES)
        expect(ctx.reply).toHaveBeenCalledWith('join_limit_reached')
      })
    })

    describe('msg:document (invalid mime type)', () => {
      it('should not add file path and notify user if mime type is invalid', async () => {
        ctx.message!.document!.mime_type = 'image/png'

        await expect(handler.events['msg:document'](ctx)).rejects.toThrow(InvalidFileError)

        expect(ctx.getFile).not.toHaveBeenCalled()
        expect((ctx.session.params as JoinParams).paths.length).toBe(0)
        expect(ctx.reply).toHaveBeenCalledWith(
          'invalid_pdf',
        )
      })
    })

    describe('msg:text', () => {
      it('should trigger joinPDFs when text is "done"', async () => {
        ctx.message!.text = 'done'
        ; (ctx.session.params as JoinParams).paths = [
          '/tmp/p1.pdf',
          '/tmp/p2.pdf',
        ]

        const joinPDFsSpy = vi.spyOn(handler as any, 'joinPDFs').mockImplementation(() => Promise.resolve())

        await handler.events['msg:text'](ctx)

        expect(joinPDFsSpy).toHaveBeenCalledWith(ctx)

        joinPDFsSpy.mockRestore()
      })
    })
  })

  describe('joinPDFs', () => {
    it('should reply with warning if less than 2 files', async () => {
      ; (ctx.session.params as JoinParams).paths = [join(process.cwd(), 'assets/page-3.pdf')]

      await (handler as any).joinPDFs(ctx)

      expect(ctx.reply).toHaveBeenCalledWith(
        'join_at_least_two',
      )
    })

    it('should merge real PDFs and send result when 2 or more files', async () => {
      const tempDir = await fs.mkdtemp(join(os.tmpdir(), 'pdf-studio-bot-test-join-'))
      const paths = [
        join(tempDir, 'file-1.pdf'),
        join(tempDir, 'file-2.pdf'),
      ]

      try {
        await fs.copyFile(join(process.cwd(), 'assets/lorem-ipsum.pdf'), paths[0])
        await fs.copyFile(join(process.cwd(), 'assets/page-3.pdf'), paths[1])

        ; (ctx.session.params as JoinParams).paths = [...paths]

        await (handler as any).joinPDFs(ctx)

        expect(ctx.reply).toHaveBeenCalledWith('join_merging')
        expect(mockUserRepository.incrementUsage).toHaveBeenCalledWith(123)
        expect(ctx.replyWithDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            fileData: expect.stringContaining('merged.pdf'),
            filename: 'merged.pdf',
          }),
          expect.objectContaining({
            caption: 'join_success',
          }),
        )

        expect(ctx.session.command).toBeNull()
        expect(ctx.session.params).toBeNull()
      }
      finally {
        await fs.rm(tempDir, { force: true, recursive: true })
      }
    })

    it('should handle errors and notify user if muhammara fails', async () => {
      ; (ctx.session.params as JoinParams).paths = ['/invalid/path/1.pdf', '/invalid/path/2.pdf']

      await (handler as any).joinPDFs(ctx)

      expect(ctx.reply).toHaveBeenCalledWith(
        'join_error',
      )
      expect(ctx.session.command).toBeNull()
    })

    it('should log error if removing temporary folder fails', async () => {
      const tempDir = await fs.mkdtemp(join(os.tmpdir(), 'pdf-studio-bot-test-join-err-'))
      const paths = [
        join(tempDir, 'file-1.pdf'),
        join(tempDir, 'file-2.pdf'),
      ]

      try {
        await fs.copyFile(join(process.cwd(), 'assets/lorem-ipsum.pdf'), paths[0])
        await fs.copyFile(join(process.cwd(), 'assets/page-3.pdf'), paths[1])

        ; (ctx.session.params as JoinParams).paths = [...paths]

        const fsPromises = await import('node:fs/promises')
        vi.spyOn(fsPromises.default, 'rm').mockRejectedValueOnce(new Error('rm failed'))
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')

        await (handler as any).joinPDFs(ctx)

        expect(loggerSpy).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(Error) }), expect.stringContaining('Failed to remove'))
      }
      finally {
        await fs.rm(tempDir, { recursive: true, force: true })
      }
    })

    it('should reply with warning if text is not "done"', async () => {
      ctx.message!.text = 'not-done'
      await handler.events['msg:text'](ctx)
      expect(ctx.reply).toHaveBeenCalledWith('join_more_files_required')
    })
  })
})

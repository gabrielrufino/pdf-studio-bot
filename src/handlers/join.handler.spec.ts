import type { JoinParams } from '../interfaces/session-data'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { JoinHandler } from './join.handler'

describe(JoinHandler.name, () => {
  let handler: JoinHandler

  let ctx: CustomContext

  beforeEach(() => {
    vi.clearAllMocks()
    handler = new JoinHandler()
    ctx = {
      session: {
        command: null,
        params: { paths: [] } as any,
      },
      message: {
        text: '',
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
        expect.stringContaining('📎 Send the PDF files you want to join.'),
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
        expect(ctx.reply).toHaveBeenCalledWith(
          expect.stringContaining(`📎 File received: ${filePath}`),
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
        expect.stringContaining('⚠️ You need to send at least two PDF files'),
      )
    })

    it('should merge real PDFs and send result when 2 or more files', async () => {
      const tempDir = await fs.mkdtemp(join(os.tmpdir(), 'pdf-studio-bot-test-join-'))
      const paths = [
        join(tempDir, 'file-1.pdf'),
        join(tempDir, 'file-2.pdf'),
      ]

      try {
        await fs.copyFile(join(process.cwd(), 'assets/page-1.pdf'), paths[0])
        await fs.copyFile(join(process.cwd(), 'assets/page-2.pdf'), paths[1])

        ; (ctx.session.params as JoinParams).paths = [...paths]

        await (handler as any).joinPDFs(ctx)

        expect(ctx.reply).toHaveBeenCalledWith('🔄 Merging your PDF files...')
        expect(ctx.replyWithDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            fileData: expect.stringContaining('merged.pdf'),
            filename: 'merged.pdf',
          }),
          expect.objectContaining({
            caption: '✅ Here is your joined PDF file!',
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
        expect.stringContaining('❌ An error occurred while joining your PDF files'),
      )
      expect(ctx.session.command).toBeNull()
    })
  })
})

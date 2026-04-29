import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { ToDocxHandler } from './to-docx.handler'

vi.mock('node:child_process', () => ({
  execFile: vi.fn((_file, _args, callback) => callback(null, { stdout: '', stderr: '' })),
}))

describe(ToDocxHandler.name, () => {
  let handler: ToDocxHandler
  let mockUserRepository: UserRepository
  let ctx: CustomContext

  beforeEach(() => {
    mockUserRepository = {
      incrementUsage: vi.fn(),
    } as unknown as UserRepository
    handler = new ToDocxHandler(mockUserRepository)
    ctx = {
      from: { id: 123 },
      session: {
        command: null,
        params: {} as any,
      },
      message: {
        document: {
          mime_type: 'application/pdf',
          file_name: 'test.pdf',
        },
      },
      getFile: vi.fn().mockResolvedValue({
        download: vi.fn().mockResolvedValue('/tmp/test.pdf'),
      }),
      reply: vi.fn(),
      replyWithDocument: vi.fn(),
    } as unknown as CustomContext
  })

  it('should have correct command', () => {
    expect(handler.command).toBe(CommandEnum.ToDocx)
  })

  describe(ToDocxHandler.prototype.onCommand.name, () => {
    it('should set session command and ask for PDF file', async () => {
      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('Please send the PDF file you want to convert to DOCX.')
      expect(ctx.session.command).toBe(CommandEnum.ToDocx)
    })
  })

  describe('events', () => {
    describe('msg:document', () => {
      it('should convert PDF to DOCX and send it', async () => {
        vi.spyOn(fs, 'mkdtemp').mockResolvedValue('/tmp/pdf-studio-bot-todocx-123')
        vi.spyOn(fs, 'chmod').mockResolvedValue()
        vi.spyOn(fs, 'rm').mockResolvedValue()

        await handler.events['msg:document'](ctx)

        expect(ctx.getFile).toHaveBeenCalled()
        expect(ctx.reply).toHaveBeenCalledWith('🔄 Converting your PDF to DOCX. This might take a moment...')
        expect(execFile).toHaveBeenCalledWith(
          'python3',
          expect.arrayContaining([expect.stringContaining('convert_pdf_to_docx.py'), '/tmp/test.pdf', '/tmp/pdf-studio-bot-todocx-123/output.docx']),
          expect.any(Function),
        )
        expect(ctx.replyWithDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            filename: 'test.docx',
          }),
          {
            caption: '✅ Here is your DOCX file!',
          },
        )
        expect(mockUserRepository.incrementUsage).toHaveBeenCalledWith(123)
      })

      it('should handle conversion errors', async () => {
        vi.mocked(execFile).mockImplementationOnce(((_file: string, _args: string[], callback: any) => {
          callback(new Error('Conversion failed'))
        }) as any)
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')

        await handler.events['msg:document'](ctx)

        expect(loggerSpy).toHaveBeenCalled()
        expect(ctx.reply).toHaveBeenCalledWith('❌ An error occurred while converting the PDF to DOCX.')
      })
    })
  })
})

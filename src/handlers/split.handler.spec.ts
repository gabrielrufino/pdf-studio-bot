import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { SplitHandler } from './split.handler'

describe(SplitHandler.name, () => {
  const handler = new SplitHandler()

  let ctx: CustomContext

  beforeEach(() => {
    ctx = {
      session: {
        command: null,
        params: {} as any,
      },
      message: {
        document: {
          mime_type: 'application/pdf',
        },
      },
      getFile: vi.fn().mockResolvedValue({
        download: vi.fn().mockResolvedValue(`${process.cwd()}/assets/lorem-ipsum.pdf`),
      }),
      reply: vi.fn(),
      replyWithDocument: vi.fn(),
    } as unknown as CustomContext
  })

  it('should have correct command', () => {
    expect(handler.command).toBe(CommandEnum.Split)
  })

  describe(SplitHandler.prototype.onCommand.name, () => {
    it('should set session command and ask for PDF file', async () => {
      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('Please send the PDF file you want to split.')
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
          expect(ctx.reply).toHaveBeenCalledWith('📄 Found 10 pages. Splitting...')

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
        expect(ctx.reply).toHaveBeenCalledWith('❌ An error occurred while splitting the PDF file.')
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
      })
    })
  })
})

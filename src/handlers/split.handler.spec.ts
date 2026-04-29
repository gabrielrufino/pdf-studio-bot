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
    mockUserRepository = {
      incrementUsage: vi.fn(),
    } as unknown as UserRepository
    handler = new SplitHandler(mockUserRepository)
    ctx = {
      from: { id: 123 },
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
          vi.spyOn(handler as any, 'createTempDir').mockResolvedValue(tempDir)
          vi.spyOn(handler as any, 'downloadDocument').mockResolvedValue(targetPath)

          await handler.events['msg:document'](ctx)

          expect((handler as any).downloadDocument).toHaveBeenCalled()
          expect(ctx.reply).toHaveBeenCalledWith('📄 Found 10 pages. Splitting...')
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
        vi.spyOn(handler as any, 'downloadDocument').mockRejectedValue(new Error('Download failed'))
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')

        await handler.events['msg:document'](ctx)

        expect(loggerSpy).toHaveBeenCalled()
        expect(ctx.reply).toHaveBeenCalledWith('❌ An error occurred while splitting the PDF file.')
      })

      it('should log error if cleanup fails in finally block', async () => {
        const error = new Error('Cleanup failed')
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-studio-bot-split-err-'))
        vi.spyOn(handler as any, 'createTempDir').mockResolvedValue(tempDir)
        vi.spyOn(handler as any, 'downloadDocument').mockResolvedValue('/tmp/fake-input.pdf')
        const cleanupSpy = vi.spyOn(handler as any, 'safeCleanup').mockResolvedValue(undefined)
        cleanupSpy.mockRejectedValueOnce(error)

        await expect(handler.events['msg:document'](ctx)).rejects.toThrow('Cleanup failed')

        expect(cleanupSpy).toHaveBeenCalled()
        await fs.rm(tempDir, { recursive: true, force: true })
      })
    })
  })
})

import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { Buffer } from 'node:buffer'
import { pdf } from 'pdf-to-img'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { PdfToImagesHandler } from './pdf-to-images.handler'

vi.mock('node:fs/promises', () => ({
  default: {
    rm: vi.fn().mockResolvedValue(undefined),
    mkdtemp: vi.fn().mockResolvedValue('/tmp/pdf-studio-bot-pdf-to-images-test'),
    chmod: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ size: 100 }),
  },
}))
vi.mock('pdf-to-img')
vi.mock('muhammara', () => ({
  default: {
    createReader: vi.fn().mockReturnValue({
      getPagesCount: vi.fn().mockReturnValue(2),
    }),
  },
}))

describe(PdfToImagesHandler.name, () => {
  let handler: PdfToImagesHandler
  let ctx: CustomContext
  let mockUserRepository: UserRepository

  beforeEach(() => {
    vi.clearAllMocks()

    mockUserRepository = {
      incrementUsage: vi.fn(),
      findByTelegramId: vi.fn().mockResolvedValue({ plan_type: PlanTypeEnum.Pro }),
    } as unknown as UserRepository

    handler = new PdfToImagesHandler(mockUserRepository)
    ctx = { t: (key: string) => key, from: { id: 123 }, chat: { id: 456 }, session: {
      command: null,
    }, message: {
      document: {
        mime_type: 'application/pdf',
      },
    }, getFile: vi.fn().mockResolvedValue({
      download: vi.fn().mockResolvedValue('/tmp/test.pdf'),
    }), reply: vi.fn(), replyWithPhoto: vi.fn(), api: {
      sendMediaGroup: vi.fn(),
    } } as unknown as CustomContext
  })

  it('should have correct command', () => {
    expect(handler.command).toBe(CommandEnum.PdfToImages)
  })

  describe(PdfToImagesHandler.prototype.onCommand.name, () => {
    it('should set session command and ask for PDF', async () => {
      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('pdftoimages_send_file')
      expect(ctx.session.command).toBe(CommandEnum.PdfToImages)
    })
  })

  describe('events', () => {
    describe('msg:document', () => {
      it('should return early if command is not PdfToImages', async () => {
        ctx.session.command = CommandEnum.Split

        await handler.events['msg:document'](ctx)

        expect(ctx.getFile).not.toHaveBeenCalled()
      })

      it('should convert PDF to images and send them as a media group', async () => {
        ctx.session.command = CommandEnum.PdfToImages
        const mockImages = [Buffer.from([1, 2, 3]), Buffer.from([4, 5, 6])]
        const mockDocument = {
          length: 2,
          [Symbol.asyncIterator]: vi.fn().mockReturnValue(mockImages[Symbol.iterator]()),
        }
        vi.mocked(pdf).mockResolvedValue(mockDocument as any)

        await handler.events['msg:document'](ctx)

        expect(ctx.getFile).toHaveBeenCalled()
        expect(pdf).toHaveBeenCalledWith('/tmp/test.pdf')
        expect(ctx.reply).toHaveBeenCalledWith('pdftoimages_converting')
        expect(ctx.api.sendMediaGroup).toHaveBeenCalledWith(456, expect.any(Array))
        expect(mockUserRepository.incrementUsage).not.toHaveBeenCalledWith(123)
      })

      it('should convert PDF to images and send them as a photo if only one page', async () => {
        ctx.session.command = CommandEnum.PdfToImages
        const mockImages = [Buffer.from([1, 2, 3])]
        const mockDocument = {
          length: 1,
          [Symbol.asyncIterator]: vi.fn().mockReturnValue(mockImages[Symbol.iterator]()),
        }
        vi.mocked(pdf).mockResolvedValue(mockDocument as any)

        await handler.events['msg:document'](ctx)

        expect(ctx.replyWithPhoto).toHaveBeenCalled()
        expect(mockUserRepository.incrementUsage).not.toHaveBeenCalledWith(123)
      })

      it('should notify limit exceeded for free users', async () => {
        ctx.session.command = CommandEnum.PdfToImages
        vi.mocked(mockUserRepository.findByTelegramId).mockResolvedValue({ plan_type: PlanTypeEnum.Free } as any)
        ctx.message!.document!.file_size = 20 * 1024 * 1024 // > 10MB

        await handler.events['msg:document'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('exceeded the limits of the free plan'))
      })

      it('should log error if removing temporary files fails', async () => {
        ctx.session.command = CommandEnum.PdfToImages
        const mockImages = [Buffer.from([1, 2, 3])]
        const mockDocument = {
          length: 1,
          [Symbol.asyncIterator]: vi.fn().mockReturnValue(mockImages[Symbol.iterator]()),
        }
        vi.mocked(pdf).mockResolvedValue(mockDocument as any)

        const fs = await import('node:fs/promises')
        vi.mocked(fs.default.rm).mockRejectedValue(new Error('rm failed'))
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')

        await handler.events['msg:document'](ctx)

        expect(loggerSpy).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(Error) }), expect.stringContaining('Failed to remove'))
      })

      it('should handle errors during conversion', async () => {
        ctx.session.command = CommandEnum.PdfToImages
        vi.mocked(pdf).mockRejectedValue(new Error('Conversion failed'))

        await handler.events['msg:document'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('pdftoimages_error')
      })

      it('should not reply with generic error if file is not a PDF (InvalidFileError)', async () => {
        ctx.session.command = CommandEnum.PdfToImages
        ctx.message!.document!.mime_type = 'image/png'

        await handler.events['msg:document'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('invalid_pdf')
        expect(ctx.reply).not.toHaveBeenCalledWith('pdftoimages_error')
      })
    })
  })
})

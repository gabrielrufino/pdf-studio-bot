import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { Buffer } from 'node:buffer'
import { pdf } from 'pdf-to-img'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { PdfToImagesHandler } from './pdf-to-images.handler'

vi.mock('node:fs/promises', () => ({
  default: {
    rm: vi.fn().mockResolvedValue(undefined),
    mkdtemp: vi.fn().mockResolvedValue('/tmp/pdf-studio-bot-pdf-to-images-test'),
    chmod: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}))
vi.mock('pdf-to-img')

describe(PdfToImagesHandler.name, () => {
  let handler: PdfToImagesHandler
  let ctx: CustomContext
  let mockUserRepository: UserRepository

  beforeEach(() => {
    vi.clearAllMocks()

    mockUserRepository = {
      incrementUsage: vi.fn(),
    } as unknown as UserRepository

    handler = new PdfToImagesHandler(mockUserRepository)
    ctx = {
      from: { id: 123 },
      session: {
        command: null,
      },
      message: {
        document: {
          mime_type: 'application/pdf',
        },
      },
      getFile: vi.fn().mockResolvedValue({
        download: vi.fn().mockResolvedValue('/tmp/test.pdf'),
      }),
      reply: vi.fn(),
      replyWithPhoto: vi.fn(),
    } as unknown as CustomContext
  })

  it('should have correct command', () => {
    expect(handler.command).toBe(CommandEnum.PdfToImages)
  })

  describe(PdfToImagesHandler.prototype.onCommand.name, () => {
    it('should set session command and ask for PDF', async () => {
      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('Please send the PDF file you want to convert to images.')
      expect(ctx.session.command).toBe(CommandEnum.PdfToImages)
    })
  })

  describe('events', () => {
    describe('msg:document', () => {
      it('should convert PDF to images and send them', async () => {
        const mockImages = [Buffer.from([1, 2, 3]), Buffer.from([4, 5, 6])]
        const mockDocument = {
          length: 2,
          [Symbol.asyncIterator]: vi.fn().mockReturnValue(mockImages[Symbol.iterator]()),
        }
        vi.mocked(pdf).mockResolvedValue(mockDocument as any)

        await handler.events['msg:document'](ctx)

        expect(ctx.getFile).toHaveBeenCalled()
        expect(pdf).toHaveBeenCalledWith('/tmp/test.pdf')
        expect(ctx.reply).toHaveBeenCalledWith('🖼️ Converting 2 pages to images...')
        expect(ctx.replyWithPhoto).toHaveBeenCalledTimes(2)
        expect(mockUserRepository.incrementUsage).toHaveBeenCalledWith(123)
      })

      it('should handle errors during conversion', async () => {
        vi.mocked(pdf).mockRejectedValue(new Error('Conversion failed'))

        await handler.events['msg:document'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('❌ An error occurred while converting the PDF to images.')
      })

      it('should reply with error if file is not a PDF', async () => {
        ctx.message!.document!.mime_type = 'image/png'

        await expect(handler.events['msg:document'](ctx)).rejects.toThrow()
        expect(ctx.reply).toHaveBeenCalledWith('⚠️ Please send only PDF files.')
      })
    })
  })
})

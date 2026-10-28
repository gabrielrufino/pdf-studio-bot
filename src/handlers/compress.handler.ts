import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { InputFile } from 'grammy'
import { PDFDocument } from 'pdf-lib'
import { CommandEnum } from '../enums/command.enum'
import { BaseHandler } from './base.handler'

export class CompressHandler extends BaseHandler {
  public readonly command = CommandEnum.Compress
  public readonly description = '🗜️ Compress a PDF file'

  constructor(private readonly userRepository: UserRepository) {
    super()
  }

  public readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      const paths: { inputPath?: string, outputPath?: string } = {}

      await this.processDocument(ctx, this.userRepository, async (inputPath) => {
        await ctx.reply(ctx.t('compress_compressing'))

        const pdfBytes = await fs.readFile(inputPath)
        const pdfDoc = await PDFDocument.load(pdfBytes)

        const pagesCount = pdfDoc.getPageCount()
        await this.checkLimits(ctx, { pagesCount })

        const compressedPdfBytes = await pdfDoc.save({ useObjectStreams: true })

        if (compressedPdfBytes.length >= pdfBytes.length) {
          await ctx.reply(ctx.t('compress_no_reduction'))
          return
        }

        paths.outputPath = join(os.tmpdir(), `compress-${crypto.randomUUID()}.pdf`)
        await fs.writeFile(paths.outputPath, compressedPdfBytes)

        const compressedFile = new InputFile(paths.outputPath, 'compressed.pdf')
        await ctx.replyWithDocument(compressedFile, {
          caption: ctx.t('compress_success'),
        })
      }, 'compress_error', paths)
    },
  }

  public async onCommand(ctx: CustomContext): Promise<void> {
    await this.setSessionCommand(ctx)
    await ctx.reply(ctx.t('compress_send_file'))
  }
}

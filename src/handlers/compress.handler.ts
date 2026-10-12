import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { InputFile } from 'grammy'
import { PDFDocument } from 'pdf-lib'
import { CommandEnum } from '../enums/command.enum'
import { InvalidFileError } from '../errors/invalid-file.error'
import { LimitExceededError } from '../errors/limit-exceeded.error'
import { UserNotFoundError } from '../errors/user-not-found.error'
import { BaseHandler } from './base.handler'

export class CompressHandler extends BaseHandler {
  public readonly command = CommandEnum.Compress
  public readonly description = '🗜️ Compress a PDF file'

  constructor(private readonly userRepository: UserRepository) {
    super()
  }

  public readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      let inputPath: string | undefined
      let outputPath: string | undefined

      try {
        await this.validatePDF(ctx)

        if (!ctx.user) {
          throw new UserNotFoundError()
        }

        const fileSize = ctx.message?.document?.file_size ?? 0
        await this.checkLimits(ctx, { fileSize })

        await this.runWithUsage(ctx, this.userRepository, async () => {
          const file = await ctx.getFile()
          inputPath = await file.download()

          if (!inputPath) {
            throw new Error('Failed to download file')
          }

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

          outputPath = join(os.tmpdir(), `compress-${crypto.randomUUID()}.pdf`)
          await fs.writeFile(outputPath, compressedPdfBytes)

          const compressedFile = new InputFile(outputPath, 'compressed.pdf')
          await ctx.replyWithDocument(compressedFile, {
            caption: ctx.t('compress_success'),
          })
        })
      }
      catch (error) {
        if (error instanceof InvalidFileError || error instanceof LimitExceededError) {
          return
        }

        this.logger.error(error)
        await ctx.reply(ctx.t('compress_error'))
      }
      finally {
        ctx.session.params = {
          paths: [inputPath, outputPath].filter(Boolean) as string[],
        }
        await this.resetSession(ctx)
      }
    },
  }

  public async onCommand(ctx: CustomContext): Promise<void> {
    await this.setSessionCommand(ctx)
    await ctx.reply(ctx.t('compress_send_file'))
  }
}

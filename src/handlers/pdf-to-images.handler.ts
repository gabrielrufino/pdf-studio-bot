import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import { InputFile } from 'grammy'
import { pdf } from 'pdf-to-img'
import { CommandEnum } from '../enums/command.enum'
import { BaseHandler } from './base.handler'

export class PdfToImagesHandler extends BaseHandler {
  constructor(private readonly userRepository: UserRepository) {
    super()
  }

  readonly command = CommandEnum.PdfToImages
  readonly description = '🖼️ Convert PDF pages to images'
  readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      await this.validatePDF(ctx)

      let inputPath: string | undefined

      try {
        const file = await ctx.getFile()
        inputPath = await file.download()

        if (!inputPath) {
          throw new Error('Failed to download file')
        }

        const document = await pdf(inputPath)
        let pageNumber = 1
        const totalPages = document.getPageCount()

        await ctx.reply(`🖼️ Converting ${totalPages} pages to images...`)

        for await (const image of document) {
          const imageFile = new InputFile(Buffer.from(image), `page-${pageNumber}.png`)

          await ctx.replyWithPhoto(imageFile, {
            caption: `🖼️ Page ${pageNumber} of ${totalPages}`,
          })
          pageNumber++
        }

        await this.userRepository.incrementUsage(ctx.from!.id)
      }
      catch (error) {
        this.logger.error(error)
        await ctx.reply('❌ An error occurred while converting the PDF to images.')
      }
      finally {
        if (inputPath) {
          await fs.rm(inputPath, { force: true }).catch(error =>
            this.logger.error({ error, path: inputPath }, 'Failed to remove input file.'))
        }
        await this.resetSession(ctx)
      }
    },
  }

  async onCommand(ctx: CustomContext): Promise<void> {
    await this.setSessionCommand(ctx)
    await ctx.reply('Please send the PDF file you want to convert to images.')
  }
}

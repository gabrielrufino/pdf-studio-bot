import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
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
      let outputDir: string | undefined

      try {
        outputDir = await fs.mkdtemp(join(os.tmpdir(), 'pdf-studio-bot-pdf-to-images-'))
        await fs.chmod(outputDir, 0o700)

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
          const imagePath = join(outputDir, `page-${pageNumber}.png`)
          await fs.writeFile(imagePath, Buffer.from(image))

          const imageFile = new InputFile(imagePath, `page-${pageNumber}.png`)

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
        if (outputDir) {
          await fs.rm(outputDir, { force: true, recursive: true }).catch(error =>
            this.logger.error({ error, path: outputDir }, 'Failed to remove temporary folder.'))
        }
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

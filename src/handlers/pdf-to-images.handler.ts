import type { InputMediaPhoto } from 'grammy/types'
import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { InputFile } from 'grammy'
import muhammara from 'muhammara'
import { pdf } from 'pdf-to-img'
import { CommandEnum } from '../enums/command.enum'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { InvalidFileError } from '../errors/invalid-file.error'
import { LimitExceededError } from '../errors/limit-exceeded.error'
import { UserNotFoundError } from '../errors/user-not-found.error'
import { BaseHandler } from './base.handler'

export class PdfToImagesHandler extends BaseHandler {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  private static readonly MAX_PAGES = 50

  constructor(private readonly userRepository: UserRepository) {
    super()
  }

  readonly command = CommandEnum.PdfToImages
  readonly description = '🖼️ Convert PDF pages to images'
  readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      let inputPath: string | undefined
      let outputDir: string | undefined

      try {
        await this.validatePDF(ctx)
        const file = await ctx.getFile()
        inputPath = await file.download()

        if (!inputPath) {
          throw new Error('Failed to download file')
        }

        await this.verifyLimits(ctx, inputPath)

        const document = await pdf(inputPath)
        const totalPages = document.length

        await ctx.reply(`🖼️ Converting ${totalPages} pages to images...`)

        outputDir = await fs.mkdtemp(join(os.tmpdir(), 'pdf-studio-bot-pdf-to-images-'))
        await fs.chmod(outputDir, 0o700)

        const images: string[] = []
        let pageNumber = 1
        for await (const image of document) {
          const imagePath = join(outputDir, `page-${pageNumber}.png`)
          await fs.writeFile(imagePath, image)
          images.push(imagePath)
          pageNumber++
        }

        const CHUNK_SIZE = 10
        for (let i = 0; i < images.length; i += CHUNK_SIZE) {
          const chunk = images.slice(i, i + CHUNK_SIZE)
          if (chunk.length > 1) {
            const mediaGroup: InputMediaPhoto[] = chunk.map((imagePath, index) => {
              const currentPage = i + index + 1
              return {
                type: 'photo',
                media: new InputFile(imagePath, `page-${currentPage}.png`),
                caption: index === 0 ? `🖼️ Pages ${i + 1}-${i + chunk.length} of ${totalPages}` : undefined,
              }
            })
            await ctx.api.sendMediaGroup(ctx.chat!.id, mediaGroup)
          }
          else {
            const currentPage = i + 1
            await ctx.replyWithPhoto(new InputFile(chunk[0], `page-${currentPage}.png`), {
              caption: `🖼️ Page ${currentPage} of ${totalPages}`,
            })
          }
        }

        await this.userRepository.incrementUsage(ctx.from?.id ?? 0)
      }
      catch (error) {
        if (error instanceof InvalidFileError || error instanceof LimitExceededError) {
          return
        }

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

  private async verifyLimits(ctx: CustomContext, path: string): Promise<void> {
    const user = await this.userRepository.findByTelegramId(ctx.from?.id ?? 0)
    if (!user)
      throw new UserNotFoundError()
    if (user.plan_type === PlanTypeEnum.Pro)
      return

    const stats = await fs.stat(path)
    if (stats.size > PdfToImagesHandler.MAX_FILE_SIZE) {
      await this.notifyLimitExceeded(ctx)
      throw new LimitExceededError()
    }

    const pdfReader = muhammara.createReader(path)
    if (pdfReader.getPagesCount() > PdfToImagesHandler.MAX_PAGES) {
      await this.notifyLimitExceeded(ctx)
      throw new LimitExceededError()
    }
  }

  private async notifyLimitExceeded(ctx: CustomContext): Promise<void> {
    await ctx.reply('⚠️ You have exceeded the limits of the free plan. You need to become pro and it costs 10 $ / month. Talk to @gabrielrufino to buy the pro plan.')
  }
}

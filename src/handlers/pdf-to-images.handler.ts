import type { InputMediaPhoto } from 'grammy/types'
import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { InputFile } from 'grammy'
import { pdf } from 'pdf-to-img'
import { CommandEnum } from '../enums/command.enum'
import { InvalidFileError } from '../errors/invalid-file.error'
import { LimitExceededError } from '../errors/limit-exceeded.error'
import { UserNotFoundError } from '../errors/user-not-found.error'
import { BaseHandler } from './base.handler'

export class PdfToImagesHandler extends BaseHandler {
  constructor(private readonly userRepository: UserRepository) {
    super()
  }

  readonly command = CommandEnum.PdfToImages
  readonly description = '🖼️ Convert PDF pages to images'
  readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      if (ctx.session.command !== CommandEnum.PdfToImages) {
        return
      }

      let inputPath: string | undefined
      let outputDir: string | undefined

      try {
        await this.validatePDF(ctx)

        if (!ctx.user) {
          throw new UserNotFoundError()
        }

        const fileSize = ctx.message?.document?.file_size ?? 0
        await this.checkLimits(ctx, { fileSize })

        const file = await ctx.getFile()
        inputPath = await file.download()

        if (!inputPath) {
          throw new Error('Failed to download file')
        }

        const document = await pdf(inputPath)
        const totalPages = document.length

        await this.checkLimits(ctx, { pagesCount: totalPages })

        await ctx.reply(ctx.t('pdftoimages_converting'))

        outputDir = await fs.mkdtemp(join(os.tmpdir(), 'pdf-studio-bot-pdf-to-images-'))
        await fs.chmod(outputDir, 0o700)

        const images: string[] = []
        const writePromises: Promise<void>[] = []
        let pageNumber = 1
        for await (const image of document) {
          const imagePath = join(outputDir, `page-${pageNumber}.png`)
          writePromises.push(fs.writeFile(imagePath, image))
          images.push(imagePath)
          pageNumber++
        }
        const writeResults = await Promise.allSettled(writePromises)
        const failedWrite = writeResults.find((result): result is PromiseRejectedResult => result.status === 'rejected')
        if (failedWrite) {
          throw failedWrite.reason
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

        await this.userRepository.incrementUsage(ctx.from!.id)
      }
      catch (error) {
        if (error instanceof InvalidFileError || error instanceof LimitExceededError) {
          return
        }

        this.logger.error(error)
        await ctx.reply(ctx.t('pdftoimages_error'))
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
    await ctx.reply(ctx.t('pdftoimages_send_file'))
  }
}

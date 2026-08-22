import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { InlineKeyboard, InputFile } from 'grammy'
import { degrees, PDFDocument } from 'pdf-lib'
import { CommandEnum } from '../enums/command.enum'
import { InvalidFileError } from '../errors/invalid-file.error'
import { LimitExceededError } from '../errors/limit-exceeded.error'
import { UserNotFoundError } from '../errors/user-not-found.error'
import { rotateParamsSchema } from '../schemas/rotate-params.schema'
import { BaseHandler } from './base.handler'

export class RotateHandler extends BaseHandler {
  constructor(private readonly userRepository: UserRepository) {
    super()
  }

  readonly command = CommandEnum.Rotate
  readonly description = '🔄 Rotate a PDF file'
  readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      try {
        await this.validatePDF(ctx)

        if (!ctx.user) {
          throw new UserNotFoundError()
        }

        const documentId = ctx.message?.document?.file_id
        if (!documentId)
          return

        ctx.session.params = {
          file_id: documentId,
        }

        const keyboard = new InlineKeyboard()
          .text('90°', 'rotate_90')
          .text('180°', 'rotate_180')
          .text('-90°', 'rotate_-90')

        await ctx.reply(ctx.t('rotate_choose_degrees'), {
          reply_markup: keyboard,
        })
      }
      catch (error) {
        if (error instanceof InvalidFileError || error instanceof LimitExceededError) {
          return
        }

        this.logger.error(error)
        await ctx.reply(ctx.t('rotate_error'))
      }
    },
    'callback_query': async (ctx: CustomContext) => {
      let inputPath: string | undefined
      let outputPath: string | undefined

      try {
        if (!ctx.user) {
          throw new UserNotFoundError()
        }

        const data = ctx.callbackQuery?.data
        if (!data?.startsWith('rotate_'))
          return

        const [, degreesStr] = data.split('_')
        if (!degreesStr)
          return
        const degreesValue = Number(degreesStr)

        if (![90, 180, -90].includes(degreesValue))
          return

        await ctx.answerCallbackQuery()

        const { file_id: fileId } = this.validateParams(rotateParamsSchema, ctx.session.params)

        // We edit the message to remove keyboard
        await ctx.editMessageText(ctx.t('rotate_rotating'))

        const file = await ctx.api.getFile(fileId)

        const fileSize = file.file_size ?? 0
        await this.checkLimits(ctx, { fileSize })

        inputPath = await file.download()

        if (!inputPath) {
          throw new Error('Failed to download file')
        }

        const pdfBytes = await fs.readFile(inputPath)
        const pdfDoc = await PDFDocument.load(pdfBytes)

        const pagesCount = pdfDoc.getPageCount()
        await this.checkLimits(ctx, { pagesCount })

        const pages = pdfDoc.getPages()
        for (const page of pages) {
          const currentRotation = page.getRotation().angle
          const newRotation = ((currentRotation + degreesValue) % 360 + 360) % 360
          page.setRotation(degrees(newRotation))
        }

        const savedPdfBytes = await pdfDoc.save()

        outputPath = join(os.tmpdir(), `rotate-${Date.now()}.pdf`)
        await fs.writeFile(outputPath, savedPdfBytes)

        const rotatedFile = new InputFile(outputPath, 'rotated.pdf')
        await ctx.replyWithDocument(rotatedFile, {
          caption: ctx.t('rotate_success'),
        })

        await this.userRepository.incrementUsage(ctx.from!.id)
      }
      catch (error) {
        if (error instanceof LimitExceededError) {
          return
        }

        this.logger.error(error)
        await ctx.reply(ctx.t('rotate_error'))
      }
      finally {
        if (inputPath) {
          await fs.rm(inputPath, { force: true }).catch(error =>
            this.logger.error({ error, path: inputPath }, 'Failed to remove input file.'),
          )
        }
        if (outputPath) {
          await fs.rm(outputPath, { force: true }).catch(error =>
            this.logger.error({ error, path: outputPath }, 'Failed to remove output file.'),
          )
        }
        await this.resetSession(ctx)
      }
    },
  }

  async onCommand(ctx: CustomContext): Promise<void> {
    await this.setSessionCommand(ctx)
    await ctx.reply(ctx.t('rotate_send_file'))
  }
}

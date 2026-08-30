import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { InputFile } from 'grammy'
import muhammara from 'muhammara'
import { CommandEnum } from '../enums/command.enum'
import { InvalidFileError } from '../errors/invalid-file.error'
import { LimitExceededError } from '../errors/limit-exceeded.error'
import { UserNotFoundError } from '../errors/user-not-found.error'
import { ExtractParamsSchema } from '../schemas/extract-params.schema'
import { BaseHandler } from './base.handler'

export class ExtractHandler extends BaseHandler {
  constructor(private readonly userRepository: UserRepository) {
    super()
  }

  readonly command = CommandEnum.Extract
  readonly description = '✂️ Extract pages from a PDF'
  readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      try {
        const params = this.validateParams(ExtractParamsSchema, ctx.session.params)
        await this.validatePDF(ctx)

        if (!ctx.user) {
          throw new UserNotFoundError()
        }

        const fileSize = ctx.message?.document?.file_size ?? 0
        await this.checkLimits(ctx, { fileSize })

        if (params.path) {
          await fs.rm(params.path, { force: true, recursive: true }).catch(error =>
            this.logger.error({ error, path: params.path }, 'Failed to remove previous temporary file.'),
          )
        }

        const file = await ctx.getFile()
        const inputPath = await file.download()

        if (!inputPath) {
          throw new Error('Failed to download file')
        }

        ctx.session.params = {
          ...params,
          path: inputPath,
        }

        await ctx.reply(ctx.t('extract_send_range'))
      }
      catch (error) {
        if (error instanceof InvalidFileError || error instanceof LimitExceededError) {
          return
        }

        this.logger.error(error)
        await ctx.reply(ctx.t('extract_error'))
      }
    },
    'msg:text': async (ctx: CustomContext) => {
      let outputPath: string | undefined
      let inputPath: string | undefined

      try {
        if (!ctx.user) {
          throw new UserNotFoundError()
        }

        const params = this.validateParams(ExtractParamsSchema, ctx.session.params)
        inputPath = params.path ?? undefined

        if (!inputPath) {
          await ctx.reply(ctx.t('extract_send_file'))
          return
        }

        const rangeText = ctx.message?.text?.trim() || ''
        const match = rangeText.match(/^(\d+)\s*-\s*(\d+)$/)
        if (!match) {
          await ctx.reply(ctx.t('extract_invalid_range'))
          return
        }

        const startPage = Number.parseInt(match[1], 10)
        const endPage = Number.parseInt(match[2], 10)

        if (startPage < 1 || endPage < startPage) {
          await ctx.reply(ctx.t('extract_invalid_range'))
          return
        }

        const pdfReader = muhammara.createReader(inputPath)
        const totalPages = pdfReader.getPagesCount()
        await this.checkLimits(ctx, { pagesCount: totalPages })

        if (startPage > totalPages || endPage > totalPages) {
          await ctx.reply(ctx.t('extract_invalid_range'))
          return
        }

        await ctx.reply(ctx.t('extract_extracting'))

        outputPath = join(os.tmpdir(), `extract-${Date.now()}.pdf`)
        const pdfWriter = muhammara.createWriter(outputPath)
        const copyCtx = pdfWriter.createPDFCopyingContext(inputPath)

        for (let i = startPage - 1; i < endPage; i++) {
          copyCtx.appendPDFPageFromPDF(i)
        }

        pdfWriter.end()

        const extractedFile = new InputFile(outputPath, `extracted-${startPage}-${endPage}.pdf`)
        await ctx.replyWithDocument(extractedFile, {
          caption: ctx.t('extract_success'),
        })

        await this.userRepository.incrementUsage(ctx.from!.id)
      }
      catch (error) {
        this.logger.error(error)
        await ctx.reply(ctx.t('extract_error'))
      }
      finally {
        if (inputPath) {
          await fs.rm(inputPath, { force: true, recursive: true }).catch(error =>
            this.logger.error({ error, path: inputPath }, 'Failed to remove input file.'),
          )
        }
        if (outputPath) {
          await fs.rm(outputPath, { force: true, recursive: true }).catch(error =>
            this.logger.error({ error, path: outputPath }, 'Failed to remove output file.'),
          )
        }
        await this.resetSession(ctx)
      }
    },
  }

  async onCommand(ctx: CustomContext): Promise<void> {
    await this.setSessionCommand(ctx)
    ctx.session.params = { path: null }
    await ctx.reply(ctx.t('extract_send_file'))
  }
}

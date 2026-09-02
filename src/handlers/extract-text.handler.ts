import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { InputFile } from 'grammy'

import { PDFParse } from 'pdf-parse'
import { CommandEnum } from '../enums/command.enum'
import { InvalidFileError } from '../errors/invalid-file.error'
import { LimitExceededError } from '../errors/limit-exceeded.error'
import { UserNotFoundError } from '../errors/user-not-found.error'
import { BaseHandler } from './base.handler'

export class ExtractTextHandler extends BaseHandler {
  public readonly command = CommandEnum.ExtractText
  public readonly description = '📝 Extract text from a PDF'

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

        const file = await ctx.getFile()
        inputPath = await file.download()

        if (!inputPath) {
          throw new Error('Failed to download file')
        }

        await ctx.reply(ctx.t('extracttext_extracting'))

        const parser = new PDFParse({ url: inputPath })
        const result = await parser.getText()
        const text = result.text

        if (typeof text !== 'string') {
          throw new TypeError('Failed to parse text from PDF')
        }

        outputPath = join(os.tmpdir(), `extract-text-${crypto.randomUUID()}.txt`)
        await fs.writeFile(outputPath, text)

        const extractedFile = new InputFile(outputPath, 'extracted-text.txt')
        await ctx.replyWithDocument(extractedFile, {
          caption: ctx.t('extracttext_success'),
        })

        await this.userRepository.incrementUsage(ctx.from!.id)
      }
      catch (error) {
        if (error instanceof InvalidFileError || error instanceof LimitExceededError) {
          return
        }

        this.logger.error(error)
        await ctx.reply(ctx.t('extracttext_error'))
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
    await ctx.reply(ctx.t('extracttext_send_file'))
  }
}

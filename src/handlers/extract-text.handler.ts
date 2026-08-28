import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { InputFile } from 'grammy'
import pdf from 'pdf-parse'
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

        const dataBuffer = await fs.readFile(inputPath)
        const data = await pdf(dataBuffer)

        if (!data || typeof data.text !== 'string') {
          throw new Error('Failed to parse text from PDF')
        }

        outputPath = join(os.tmpdir(), `extract-text-${Date.now()}.txt`)
        await fs.writeFile(outputPath, data.text)

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

  public async onCommand(ctx: CustomContext): Promise<void> {
    await this.setSessionCommand(ctx)
    await ctx.reply(ctx.t('extracttext_send_file'))
  }
}

import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { InputFile } from 'grammy'
import muhammara from 'muhammara'
import { CommandEnum } from '../enums/command.enum'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { LimitExceededError } from '../errors/limit-exceeded.error'
import { UserNotFoundError } from '../errors/user-not-found.error'
import { JoinParamsSchema } from '../schemas/join-params.schema'
import { BaseHandler } from './base.handler'

export class JoinHandler extends BaseHandler {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  constructor(private readonly userRepository: UserRepository) {
    super()
  }

  readonly command = CommandEnum.Join
  readonly description = '🔗 Join multiple PDF files into one'
  static readonly MAX_PDF_FILES = 10
  readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      const params = this.validateParams(JoinParamsSchema, ctx.session.params)

      if (params.paths.length >= JoinHandler.MAX_PDF_FILES) {
        await ctx.reply(ctx.t('join_limit_reached').replace('{max}', JoinHandler.MAX_PDF_FILES.toString()))
        return
      }

      await this.validatePDF(ctx)

      const user = await this.userRepository.findByTelegramId(ctx.from?.id ?? 0)
      if (!user) {
        throw new UserNotFoundError()
      }

      if (user.plan_type !== PlanTypeEnum.Pro && (ctx.message?.document?.file_size ?? 0) > JoinHandler.MAX_FILE_SIZE) {
        await ctx.reply(ctx.t('free_limit_reached'))
        throw new LimitExceededError()
      }

      const file = await ctx.getFile()
      const filePath = await file.download()

      params.paths.push(filePath)
      ctx.session.params = params

      await ctx.reply(
        ctx.t('join_file_received')
          .replace('{name}', ctx.message?.document?.file_name || 'file')
          .replace('{current}', params.paths.length.toString())
          .replace('{max}', JoinHandler.MAX_PDF_FILES.toString()),
      )
    },
    'msg:text': async (ctx: CustomContext) => {
      const text = ctx.message?.text?.toLowerCase()

      if (text === 'done' || text === ctx.t('done')) {
        await this.joinPDFs(ctx)
        return
      }

      await ctx.reply(ctx.t('join_more_files_required'))
    },
  }

  async onCommand(ctx: CustomContext) {
    await this.setSessionCommand(ctx)
    ctx.session.params = { paths: [] }
    await ctx.reply(
      ctx.t('join_send_files').replace('{max}', JoinHandler.MAX_PDF_FILES.toString()),
    )
  }

  private async joinPDFs(ctx: CustomContext) {
    const { paths } = this.validateParams(JoinParamsSchema, ctx.session.params)

    if (paths.length < 2) {
      await ctx.reply(ctx.t('join_at_least_two'))
      return
    }

    const outputDir = await fs.mkdtemp(join(os.tmpdir(), 'pdf-studio-bot-join-'))
    await fs.chmod(outputDir, 0o700)
    const outputPath = join(outputDir, 'merged.pdf')

    try {
      await ctx.reply(ctx.t('join_merging'))

      const pdfWriter = muhammara.createWriter(outputPath)

      for (const path of paths) {
        pdfWriter.appendPDFPagesFromPDF(path)
      }

      pdfWriter.end()

      await ctx.replyWithDocument(new InputFile(outputPath, 'merged.pdf'), {
        caption: ctx.t('join_success'),
      })
    }
    catch (error) {
      this.logger.error(error)
      await ctx.reply(ctx.t('join_error'))
    }
    finally {
      await fs.rm(outputDir, { force: true, recursive: true }).catch(error =>
        this.logger.error({ error, path: outputDir }, 'Failed to remove temporary folder.'))

      await this.resetSession(ctx)
    }
  }
}

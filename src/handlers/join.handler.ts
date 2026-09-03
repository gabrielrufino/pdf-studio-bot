import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { InputFile } from 'grammy'
import muhammara from 'muhammara'
import { CommandEnum } from '../enums/command.enum'
import { UserNotFoundError } from '../errors/user-not-found.error'
import { JoinParamsSchema } from '../schemas/join-params.schema'
import { formatString } from '../utils/format.util'
import { BaseHandler } from './base.handler'

export class JoinHandler extends BaseHandler {
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
        await ctx.reply(formatString(ctx.t('join_limit_reached'), {
          max: JoinHandler.MAX_PDF_FILES.toString(),
        }))
        return
      }

      await this.validatePDF(ctx)

      if (!ctx.user) {
        throw new UserNotFoundError()
      }

      const fileSize = ctx.message?.document?.file_size ?? 0
      await this.checkLimits(ctx, { fileSize })

      const file = await ctx.getFile()
      const filePath = await file.download()

      params.paths.push(filePath)
      ctx.session.params = params

      await ctx.reply(
        formatString(ctx.t('join_file_received'), {
          name: ctx.message?.document?.file_name || 'file',
          current: params.paths.length.toString(),
          max: JoinHandler.MAX_PDF_FILES.toString(),
        }),
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
      formatString(ctx.t('join_send_files'), {
        max: JoinHandler.MAX_PDF_FILES.toString(),
      }),
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
      await this.userRepository.incrementUsage(ctx.from!.id)
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

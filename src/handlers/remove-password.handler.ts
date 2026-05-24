import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { InputFile } from 'grammy'
import muhammara from 'muhammara'
import { CommandEnum } from '../enums/command.enum'
import { SessionValidationError } from '../errors/session-validation.error'
import { RemovePasswordParamsSchema } from '../schemas/remove-password-params.schema'
import { BaseHandler } from './base.handler'

export class RemovePasswordHandler extends BaseHandler {
  constructor(private readonly userRepository: UserRepository) {
    super()
  }

  public readonly command = CommandEnum.RemovePassword
  public readonly description = '🔓 Remove password from a PDF'
  public readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      const params = this.validateParams(RemovePasswordParamsSchema, ctx.session.params)

      await this.validatePDF(ctx)

      const file = await ctx.getFile()
      const filePath = await file.download()

      ctx.session.params = {
        ...params,
        path: filePath,
      }

      await ctx.reply(ctx.t('removepassword_send_password'))
    },
    'msg:text': async (ctx: CustomContext) => {
      const params = this.validateParams(RemovePasswordParamsSchema, ctx.session.params)

      if (!params.path) {
        throw new SessionValidationError()
      }

      await ctx.reply(ctx.t('removepassword_removing'))

      const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-studio-bot-rempwd-'))
      await fs.chmod(outputDir, 0o700)
      const output = path.join(outputDir, 'output.pdf')

      const password = ctx.message?.text
      await ctx.deleteMessage().catch(error => this.logger.error(error, 'Failed to delete message.'))

      try {
        const pdfWriter = muhammara.createWriter(output)
        pdfWriter.appendPDFPagesFromPDF(params.path!, { password })
        pdfWriter.end()

        await ctx.replyWithDocument(new InputFile(output), {
          caption: ctx.t('removepassword_success'),
        })

        await this.userRepository.incrementUsage(ctx.from!.id)
      }
      catch (error) {
        this.logger.error(error)
        await ctx.reply(ctx.t('removepassword_error'))
      }
      finally {
        await Promise.all([
          fs.rm(params.path!).catch(error =>
            this.logger.error({ error, path: params.path }, 'Failed to remove input file.')),
          fs.rm(outputDir, { force: true, recursive: true }).catch(error =>
            this.logger.error({ error, path: outputDir }, 'Failed to remove temporary directory.')),
          this.resetSession(ctx),
        ])
      }
    },
  }

  public async onCommand(ctx: CustomContext): Promise<void> {
    await this.setSessionCommand(ctx)
    ctx.session.params = { path: null }

    await ctx.reply(ctx.t('removepassword_send_file'))
  }
}

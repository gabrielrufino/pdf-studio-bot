import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { InputFile } from 'grammy'
import { PasswordParamsSchema } from '../schemas/password-params.schema'
import { BaseHandler } from './base.handler'

export abstract class PasswordBaseHandler extends BaseHandler {
  constructor(protected readonly userRepository: UserRepository) {
    super()
  }

  protected abstract get prefix(): string

  protected abstract processPDF(input: string, output: string, password?: string): Promise<void>

  public readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      const params = this.validateParams(PasswordParamsSchema, ctx.session.params)

      await this.validatePDF(ctx)

      if (params.path) {
        await fs.rm(params.path, { force: true, recursive: true }).catch(error =>
          this.logger.error({ error, path: params.path }, 'Failed to remove previous temporary file.'),
        )
      }

      const file = await ctx.getFile()
      const filePath = await file.download()

      ctx.session.params = {
        ...params,
        path: filePath,
      }

      await ctx.reply(ctx.t(`${this.prefix}_send_password`))
    },
    'msg:text': async (ctx: CustomContext) => {
      const params = this.validateParams(PasswordParamsSchema, ctx.session.params)

      if (!params.path) {
        await ctx.reply(ctx.t(`${this.prefix}_send_file`))
        return
      }

      await ctx.reply(ctx.t(`${this.prefix}_processing`))

      const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), `pdf-studio-bot-${this.prefix}-`))
      await fs.chmod(outputDir, 0o700)
      const output = path.join(outputDir, 'output.pdf')

      const password = ctx.message?.text
      await ctx.deleteMessage().catch(error => this.logger.error(error, 'Failed to delete message.'))

      try {
        await this.processPDF(params.path, output, password)

        await ctx.replyWithDocument(new InputFile(output), {
          caption: ctx.t(`${this.prefix}_success`),
        })

        await this.userRepository.incrementUsage(ctx.from!.id)
        await this.resetSession(ctx)
      }
      catch (error) {
        this.logger.error(error)
        await ctx.reply(ctx.t(`${this.prefix}_error`))
      }
      finally {
        await fs.rm(outputDir, { force: true, recursive: true }).catch(error =>
          this.logger.error({ error, path: outputDir }, 'Failed to remove temporary directory.'))
      }
    },
  }

  public async onCommand(ctx: CustomContext): Promise<void> {
    await this.setSessionCommand(ctx)
    ctx.session.params = { path: null }

    await ctx.reply(ctx.t(`${this.prefix}_send_file`))
  }
}

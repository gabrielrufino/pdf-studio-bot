import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { join } from 'node:path'
import { InputFile } from 'grammy'
import { Recipe } from 'muhammara'
import { bot } from '../config/bot'
import { CommandEnum } from '../enums/command.enum'
import { SessionValidationError } from '../errors/session-validation.error'
import { PutPasswordParamsSchema } from '../schemas/put-password-params.schema'
import { BaseHandler } from './base.handler'

export class PutPasswordHandler extends BaseHandler {
  constructor(private readonly userRepository: UserRepository) {
    super()
  }

  public readonly command = CommandEnum.PutPassword
  public readonly description = '🔐 Protect a PDF with a password'
  public readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      const params = this.validateParams(PutPasswordParamsSchema, ctx.session.params)

      await this.validatePDF(ctx)

      const filePath = await this.downloadDocument(ctx)

      ctx.session.params = {
        ...params,
        path: filePath,
      }

      await ctx.reply('🔑 File received! Now, please send the password you\'d like to use to protect it.')
    },
    'msg:text': async (ctx: CustomContext) => {
      const params = this.validateParams(PutPasswordParamsSchema, ctx.session.params)

      if (!params.path) {
        throw new SessionValidationError()
      }

      await ctx.reply('🔒 Protecting your PDF file with the password...')

      const outputDir = await this.createTempDir('pdf-studio-bot-putpwd-')
      const output = join(outputDir, 'output.pdf')

      const password = ctx.message?.text
      bot.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id)

      try {
        await new Promise<void>((resolve, reject) => {
          new Recipe(params.path!, output)
            .encrypt({
              userPassword: password,
            })
            .endPDF((err?: Error) => {
              if (err) {
                return reject(err)
              }
              ctx.replyWithDocument(new InputFile(output), {
                caption: '✅ Here is your password-protected PDF!',
              })
                .then(async () => {
                  await this.userRepository.incrementUsage(ctx.from!.id)
                  resolve()
                })
                .catch(reject)
            })
        })
      }
      catch (error) {
        this.logger.error(error)
        await ctx.reply('❌ An error occurred while putting a password on the PDF file.')
      }
      finally {
        await this.safeCleanup([outputDir])
        await this.resetSession(ctx)
      }
    },
  }

  public async onCommand(ctx: CustomContext): Promise<void> {
    await this.setSessionCommand(ctx)
    ctx.session.params = { path: null }

    await ctx.reply('📄 Please send the PDF file you want to protect with a password.')
  }
}

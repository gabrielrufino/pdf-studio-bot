import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import path from 'node:path'
import { InputFile } from 'grammy'
import { Recipe } from 'muhammara'
import { bot } from '../config/bot'
import { CommandEnum } from '../enums/command.enum'
import { SessionValidationError } from '../errors/session-validation.error'
import { PutPasswordParamsSchema } from '../schemas/put-password-params.schema'
import { BaseHandler } from './base.handler'

export class PutPasswordHandler extends BaseHandler {
  public readonly command = CommandEnum.PutPassword
  public readonly description = 'Protect a PDF with a password'
  public readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      const params = this.validateParams(PutPasswordParamsSchema, ctx.session.params)
      const file = await ctx.getFile()
      const filePath = await file.download()

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

      const output = path.join(path.dirname(params.path!), 'output.pdf')

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
                .then(() => resolve())
                .catch(reject)
            })
        })
      }
      catch (error) {
        this.logger.error(error)
        await ctx.reply('❌ An error occurred while putting a password on the PDF file.')
      }
      finally {
        const cleanup = [params.path!, output]
        await Promise.all(cleanup.map(p => fs.rm(p, { force: true, recursive: true }).catch(error =>
          this.logger.error({ error, path: p }, 'Failed to remove temporary file.'))))
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

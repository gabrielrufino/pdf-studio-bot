import type { CustomContext } from '../types/custom-context.type'
import crypto from 'node:crypto'
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

      await ctx.reply('Send the password')
    },
    'msg:text': async (ctx: CustomContext) => {
      const params = this.validateParams(PutPasswordParamsSchema, ctx.session.params)

      if (!params.path) {
        throw new SessionValidationError()
      }

      await ctx.reply('Putting a password on the PDF file')

      const output = path.join(path.dirname(params.path!), 'output.pdf')

      const password = ctx.message?.text
      bot.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id)

      try {
        await new Promise<void>((resolve, reject) => {
          new Recipe(params.path!, output)
            .encrypt({
              userPassword: password,
              ownerPassword: crypto.randomUUID(),
            })
            .endPDF((err?: Error) => {
              if (err) {
                return reject(err)
              }
              ctx.replyWithDocument(new InputFile(output))
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
        await Promise.all(cleanup.map(p => fs.rm(p, { force: true }).catch(() => {})))
        this.clearSession(ctx)
      }
    },
  }

  public async onCommand(ctx: CustomContext): Promise<void> {
    this.setSessionCommand(ctx)
    ctx.session.params = { path: null }

    ctx.reply('Send the file')
  }
}

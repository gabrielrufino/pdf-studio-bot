import type { PutPasswordParams } from '../interfaces/session-data'
import type { CustomContext } from '../types/custom-context.type'
import path from 'node:path'
import { InputFile } from 'grammy'
import { Recipe } from 'muhammara'
import { bot } from '../config/bot'
import { CommandEnum } from '../enums/command.enum'
import { BaseHandler } from './base.handler'

export class PutPasswordHandler extends BaseHandler {
  public readonly command = CommandEnum.PutPassword
  public readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      const file = await ctx.getFile()
      const path = await file.download()

      ctx.session.params = {
        ...ctx.session.params as PutPasswordParams,
        path,
      }

      ctx.reply('Send the password')
    },
    'msg:text': async (ctx: CustomContext) => {
      ctx.reply('Putting a password on the PDF file')
      const params = ctx.session.params as PutPasswordParams

      const output = path.join(path.dirname(params.path!), 'output.pdf')

      const password = ctx.message?.text
      bot.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id)

      new Recipe(params.path!, output)
        .encrypt({
          userPassword: password,
          ownerPassword: 'umasenhasupersecreta',
        })
        .endPDF(async () => {
          await ctx.replyWithDocument(new InputFile(output))
          this.clearSession(ctx)
        })
    },
  }

  public async onCommand(ctx: CustomContext): Promise<void> {
    this.setSessionCommand(ctx)
    ctx.session.params = { path: null }

    ctx.reply('Send the file')
  }
}

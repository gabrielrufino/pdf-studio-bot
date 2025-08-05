import type { CustomContext } from '../config/bot'
import type { Handler } from '../interfaces/handler.interface'
import type { PutPasswordParams } from '../interfaces/session-data'
import path from 'node:path'
import { InputFile } from 'grammy'
import { Recipe } from 'muhammara'
import { bot } from '../config/bot'
import { CommandEnum } from '../enumerables/command.enum'

export class PutPasswordHandler implements Handler {
  public readonly command = CommandEnum.PutPassword
  public readonly events = {
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
        .endPDF(() => {
          ctx.replyWithDocument(new InputFile(output))
        })
    },
  }
}

import path from 'node:path'
import { InputFile } from 'grammy'
import { Recipe } from 'muhammara'
import { bot } from '../config/bot'
import { CommandEnum } from '../enumerables/command.enum'

bot.on('msg:text', async (ctx) => {
  if (ctx.session.command === CommandEnum.PutPassword) {
    ctx.reply('Preparando o arquivo')
    const output = path.join(path.dirname(ctx.session.params!.path!), 'output.pdf')

    const password = ctx.message?.text
    bot.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id)

    new Recipe(ctx.session.params!.path!, output)
      .encrypt({
        userPassword: password,
        ownerPassword: 'umasenhasupersecreta',
      })
      .endPDF(() => {
        ctx.replyWithDocument(new InputFile(output))
      })
  }
})

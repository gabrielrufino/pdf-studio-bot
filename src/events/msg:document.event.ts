import { bot } from '../config/bot'
import { CommandEnum } from '../enumerables/command.enum'
import { PutPasswordHandler } from '../handlers/put-password.handler'

bot.on('msg:document', async (ctx) => {
  if (ctx.session.command === CommandEnum.PutPassword) {
    await new PutPasswordHandler().events['msg:document'](ctx)
  }
})

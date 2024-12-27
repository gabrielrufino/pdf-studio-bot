import { bot } from "../config/bot";
import { CommandEnum } from "../enumerables/command.enum";
import { PutPasswordParams } from "../interfaces/session-data";

bot.on('msg:document', async (ctx) => {
  if (ctx.session.command === CommandEnum.PutPassword) {
    const file = await ctx.getFile()
    const path = await file.download()
 
    ctx.session.params = {
      ...ctx.session.params as PutPasswordParams,
      path,
    }
    
    ctx.reply('Send the password')
  }
})

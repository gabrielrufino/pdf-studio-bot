import { bot } from '../config/bot';
import { CommandEnum } from '../enumerables/command.enum';

bot.command(CommandEnum.PutPassword, async (ctx) => {
  ctx.session.command = CommandEnum.PutPassword

  console.log(ctx.session)

  ctx.reply('Soon')
})

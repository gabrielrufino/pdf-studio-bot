import { bot } from '../config/bot'
import { logger } from '../config/logger'
import { CommandEnum } from '../enumerables/command.enum'
import { DownloadHandler } from '../handlers/download.handler'
import { PutPasswordHandler } from '../handlers/put-password.handler'

bot.on('msg:text', async (ctx) => {
  const handlerByCommand: Record<CommandEnum, (...args: any[]) => Promise<void>> = {
    [CommandEnum.Download]: async () => {
      await new DownloadHandler().events['msg:text'](ctx)
    },
    [CommandEnum.PutPassword]: async () => {
      await new PutPasswordHandler().events['msg:text'](ctx)
    },
  }

  await handlerByCommand[ctx.session.command as CommandEnum]()
    .catch((error) => {
      logger.error('Error handling command:', ctx.session.command, error)
    })
})

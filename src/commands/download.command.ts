import type { DownloadParams } from '../interfaces/session-data'
import { bot } from '../config/bot'
import { CommandEnum } from '../enumerables/command.enum'

bot.command(CommandEnum.Download, async (ctx) => {
  ctx.session.command = CommandEnum.Download
  ctx.session.params = {
    url: null,
  } as DownloadParams

  ctx.reply('Send the URL of the file to download')
})

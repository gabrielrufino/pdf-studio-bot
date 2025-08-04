import type { PutPasswordParams } from '../interfaces/session-data'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { InputFile } from 'grammy'
import { Recipe } from 'muhammara'
import puppeteer from 'puppeteer'
import { bot } from '../config/bot'
import { logger } from '../config/logger'
import { CommandEnum } from '../enumerables/command.enum'

bot.on('msg:text', async (ctx) => {
  const handlerByCommand: Record<CommandEnum, () => Promise<void>> = {
    [CommandEnum.Download]: async () => {
      const url = ctx.message?.text

      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })

      const page = await browser.newPage()
      await page.goto(url!, {
        waitUntil: 'networkidle0',
      })

      const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'pdffromlink-'))
      const filePath = path.join(folder, 'file.pdf')
      await page.pdf({ path: filePath })

      const title = await page.title()
      const document = new InputFile(filePath, `${title}.pdf`)

      await Promise.all([
        page.close(),
        ctx.replyWithDocument(document),
      ])
    },
    [CommandEnum.PutPassword]: async () => {
      ctx.reply('Preparando o arquivo')
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

  await handlerByCommand[ctx.session.command as CommandEnum]()
    .catch((error) => {
      logger.error('Error handling command:', ctx.session.command, error)
    })
})

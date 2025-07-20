import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { InputFile } from 'grammy'
import { Recipe } from 'muhammara'
import puppeteer from 'puppeteer'
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

  if (ctx.session.command === CommandEnum.Download) {
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
      // requestRepository.create({ context: JSON.parse(JSON.stringify(context)) }),
    ])

    // logger.info({ context })

    ctx.reply(`URL recebida: ${url}`)
  }
})

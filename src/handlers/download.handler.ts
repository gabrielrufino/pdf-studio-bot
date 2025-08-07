import type { CustomContext } from '../config/bot'
import type { Handler } from '../interfaces/handler.interface'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { InputFile } from 'grammy'
import puppeteer from 'puppeteer'
import { CommandEnum } from '../enumerables/command.enum'

export class DownloadHandler implements Handler {
  public readonly command = CommandEnum.Download
  public readonly events = {
    'msg:text': async (ctx: CustomContext) => {
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
  }

  public async onCommand(ctx: CustomContext): Promise<void> {
    ctx.session.command = CommandEnum.Download
    ctx.session.params = {
      url: null,
    }

    ctx.reply('Send the URL of the file to download')
  }
}

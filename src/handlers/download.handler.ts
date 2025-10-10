import type { PDFOptions } from 'puppeteer'
import type { CustomContext } from '../config/bot'
import type { Handler } from '../interfaces/handler.interface'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { InputFile } from 'grammy'
import puppeteer from 'puppeteer'
import { CommandEnum } from '../enums/command.enum'

export class DownloadHandler implements Handler {
  private static readonly PDF_CONFIG: Partial<PDFOptions> = {
    format: 'A4' as const,
    margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    printBackground: true,
  }

  private static getBrowserConfig() {
    const baseConfig = {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      headless: true,
      timeout: 30000,
    }

    if (process.env.NODE_ENV === 'production') {
      return {
        ...baseConfig,
        executablePath: '/usr/bin/chromium-browser',
        args: [
          ...baseConfig.args,
          '--no-zygote',
          '--single-process',
        ],
      }
    }

    return baseConfig
  }

  readonly command = CommandEnum.Download
  readonly events = {
    'msg:text': async (ctx: CustomContext) => {
      const url = ctx.message?.text

      const browser = await puppeteer.launch(DownloadHandler.getBrowserConfig())

      const page = await browser.newPage()
      await page.goto(url!, {
        waitUntil: 'networkidle0',
      })

      const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'pdffromlink-'))
      const filePath = path.join(folder, 'file.pdf')
      await page.pdf({
        path: filePath,
        ...DownloadHandler.PDF_CONFIG,
      })

      const title = await page.title()
      const document = new InputFile(filePath, `${title}.pdf`)

      await Promise.all([
        page.close(),
        ctx.replyWithDocument(document),
      ])
    },
  }

  async onCommand(ctx: CustomContext): Promise<void> {
    ctx.session.command = CommandEnum.Download
    ctx.session.params = { url: null }

    await ctx.reply(
      '🌐 Send me a URL and I\'ll convert it to PDF!\n\n'
      + '📝 Supported: websites, articles, documentation\n'
      + '⚠️ Note: Some sites may block automated access',
    )
  }
}

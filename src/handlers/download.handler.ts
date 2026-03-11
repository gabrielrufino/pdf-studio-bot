import type { PDFOptions } from 'puppeteer'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { InputFile } from 'grammy'
import puppeteer from 'puppeteer'
import { CommandEnum } from '../enums/command.enum'
import { SessionValidationError } from '../errors/session-validation.error'
import { DownloadParamsSchema } from '../schemas/download-params.schema'
import { BaseHandler } from './base.handler'

export class DownloadHandler extends BaseHandler {
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
      if (!ctx.message?.text?.startsWith('http')) {
        throw new SessionValidationError()
      }

      this.validateParams(DownloadParamsSchema, ctx.session.params)
      const url = ctx.message?.text

      const browser = await puppeteer.launch(DownloadHandler.getBrowserConfig())
      let folder: string | undefined

      try {
        const page = await browser.newPage()
        await page.goto(url!, {
          waitUntil: 'networkidle0',
        })

        folder = await fs.mkdtemp(path.join(os.tmpdir(), 'pdffromlink-'))
        const filePath = path.join(folder, 'file.pdf')

        await page.pdf({
          path: filePath,
          ...DownloadHandler.PDF_CONFIG,
        })

        const title = await page.title()
        const document = new InputFile(filePath, `${title}.pdf`)

        await ctx.replyWithDocument(document)
      }
      catch (error) {
        this.logger.error(error)
        await ctx.reply('❌ An error occurred while converting the URL to PDF.')
      }
      finally {
        if (folder) {
          await fs.rm(folder, { force: true, recursive: true }).catch(() => {})
        }
        await browser.close().catch(() => {})
        this.clearSession(ctx)
      }
    },
  }

  async onCommand(ctx: CustomContext): Promise<void> {
    this.setSessionCommand(ctx)
    ctx.session.params = { url: null }

    await ctx.reply(
      '🌐 Send me a URL and I\'ll convert it to PDF!\n\n'
      + '📝 Supported: websites, articles, documentation\n'
      + '⚠️ Note: Some sites may block automated access',
    )
  }
}

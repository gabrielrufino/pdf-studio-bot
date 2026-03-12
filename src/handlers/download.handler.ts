import type { Page, PDFOptions } from 'puppeteer'
import type { Browser } from '../config/browser'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { InputFile } from 'grammy'
import { z } from 'zod'
import { CommandEnum } from '../enums/command.enum'
import { SessionValidationError } from '../errors/session-validation.error'
import { DownloadParamsSchema } from '../schemas/download-params.schema'
import { BaseHandler } from './base.handler'

export class DownloadHandler extends BaseHandler {
  constructor(private readonly browser: Browser) {
    super()
  }

  private static readonly PDF_CONFIG: Partial<PDFOptions> = {
    format: 'A4' as const,
    margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    printBackground: true,
  }

  readonly command = CommandEnum.Download
  readonly description = 'Download a PDF from a URL'
  readonly events = {
    'msg:text': async (ctx: CustomContext) => {
      const urlSchema = z.url()
      const parseResult = urlSchema.safeParse(ctx.message?.text)
      if (!parseResult.success || !['http:', 'https:'].includes(new URL(parseResult.data).protocol)) {
        throw new SessionValidationError()
      }

      this.validateParams(DownloadParamsSchema, ctx.session.params)
      const url = ctx.message?.text

      const browserInstance = await this.browser.getInstance()
      let folder: string | undefined
      let page: Page | undefined

      try {
        page = await browserInstance.newPage()
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
          await fs.rm(folder, { force: true, recursive: true }).catch(() => { })
        }
        if (page) {
          await page.close().catch(() => { })
        }
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

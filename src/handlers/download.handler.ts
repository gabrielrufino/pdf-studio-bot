import type { Page, PDFOptions } from 'puppeteer'
import type { Browser } from '../config/browser'
import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import dns from 'node:dns/promises'
import fs from 'node:fs/promises'
import { isIP } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { InputFile } from 'grammy'
import { z } from 'zod'
import { CommandEnum } from '../enums/command.enum'
import { SessionValidationError } from '../errors/session-validation.error'
import { DownloadParamsSchema } from '../schemas/download-params.schema'
import { BaseHandler } from './base.handler'

export class DownloadHandler extends BaseHandler {
  constructor(
    private readonly browser: Browser,
    private readonly userRepository: UserRepository,
  ) {
    super()
  }

  private static readonly PDF_CONFIG: Partial<PDFOptions> = {
    format: 'A4' as const,
    margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    printBackground: true,
  }

  readonly command = CommandEnum.Download
  readonly description = '🌐 Download a PDF from a URL'
  readonly events = {
    'msg:text': async (ctx: CustomContext) => {
      let folder: string | undefined
      let page: Page | undefined

      try {
        const urlSchema = z.url()
        const parseResult = urlSchema.safeParse(ctx.message?.text)
        if (!parseResult.success || !['http:', 'https:'].includes(new URL(parseResult.data).protocol)) {
          throw new SessionValidationError()
        }

        const params = this.validateParams(DownloadParamsSchema, ctx.session.params)
        const url = ctx.message?.text

        await this.validateUrl(url!)

        const browserInstance = await this.browser.getInstance()
        page = await browserInstance.newPage()
        await page.goto(url!, {
          waitUntil: 'networkidle0',
        })

        folder = await fs.mkdtemp(path.join(os.tmpdir(), 'pdffromlink-'))
        await fs.chmod(folder, 0o700)
        const filePath = path.join(folder, 'file.pdf')

        ctx.session.params = {
          ...params,
          path: folder,
        }

        await page.pdf({
          path: filePath,
          ...DownloadHandler.PDF_CONFIG,
        })

        const title = await page.title()
        const sanitizedTitle = title.replace(/[/\\[\]{}()<>:;|=,*?"']/g, '').trim() || 'document'
        const document = new InputFile(filePath, `${sanitizedTitle}.pdf`)

        await ctx.replyWithDocument(document)
        await this.userRepository.incrementUsage(ctx.from!.id)
      }
      catch (error) {
        this.logger.error(error)
        await ctx.reply(ctx.t('download_error'))
      }
      finally {
        if (page) {
          await page.close().catch(error => this.logger.error({ error }, 'Failed to close page.'))
        }
        await this.resetSession(ctx)
      }
    },
  }

  async onCommand(ctx: CustomContext): Promise<void> {
    await this.setSessionCommand(ctx)
    ctx.session.params = { url: null }

    await ctx.reply(ctx.t('download_send_url'))
  }

  private async validateUrl(url: string): Promise<void> {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname

    if (this.isPrivateIP(hostname)) {
      throw new Error('Private IP addresses are not allowed')
    }

    try {
      const addresses = await dns.lookup(hostname, { all: true })
      for (const { address } of addresses) {
        if (this.isPrivateIP(address)) {
          throw new Error('URL resolves to a private IP address')
        }
      }
    }
    catch (error: any) {
      if (error.message === 'URL resolves to a private IP address') {
        throw error
      }
      // Ignore resolution errors, as they'll be handled by Puppeteer
    }
  }

  private isPrivateIP(ip: string): boolean {
    const cleanIp = ip.startsWith('[') && ip.endsWith(']') ? ip.slice(1, -1) : ip

    if (!isIP(cleanIp)) {
      return false
    }

    const ipv4PrivateRegex = /^(?:10\.|127\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.)/
    const ipv6PrivateRegex = /^(?:fc00|fd00|fe80|::1)/i
    return ipv4PrivateRegex.test(cleanIp) || ipv6PrivateRegex.test(cleanIp) || cleanIp === '0.0.0.0'
  }
}

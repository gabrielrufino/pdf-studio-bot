import type { JoinParams } from '../interfaces/session-data'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { InputFile } from 'grammy'
import muhammara from 'muhammara'
import { CommandEnum } from '../enums/command.enum'
import { BaseHandler } from './base.handler'

export class JoinHandler extends BaseHandler {
  readonly command = CommandEnum.Join
  readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      const file = await ctx.getFile()
      const filePath = await file.download()

      const params = (ctx.session.params || { paths: [] }) as JoinParams
      params.paths.push(filePath)
      ctx.session.params = params

      await ctx.reply(
        `📎 File received: ${filePath}\n\n`
        + `You have sent ${params.paths.length} file(s) so far.\n`
        + 'Send more files or type "done" to merge them.',
      )
    },
    'msg:text': async (ctx: CustomContext) => {
      const text = ctx.message?.text?.toLowerCase()

      if (text === 'done') {
        await this.joinPDFs(ctx)
      }
    },
  }

  async onCommand(ctx: CustomContext) {
    this.setSessionCommand(ctx)
    ctx.session.params = { paths: [] }
    await ctx.reply(
      '📎 Send the PDF files you want to join.\n\n'
      + 'Send multiple files one by one.\n'
      + 'When done, type "done" to merge them.',
    )
  }

  private async joinPDFs(ctx: CustomContext) {
    const params = ctx.session.params as JoinParams
    const paths = params?.paths || []

    if (paths.length < 2) {
      await ctx.reply('⚠️ You need to send at least two PDF files to join them. Please send more files.')
      return
    }

    const outputDir = await fs.mkdtemp(join(os.tmpdir(), 'pdf-studio-bot-join-'))
    const outputPath = join(outputDir, 'merged.pdf')

    try {
      await ctx.reply('🔄 Merging your PDF files...')

      const pdfWriter = muhammara.createWriter(outputPath)

      for (const path of paths) {
        pdfWriter.appendPDFPagesFromPDF(path)
      }

      pdfWriter.end()

      await ctx.replyWithDocument(new InputFile(outputPath, 'merged.pdf'), {
        caption: '✅ Here is your joined PDF file!',
      })
    }
    catch (error) {
      this.logger.error(error)
      await ctx.reply('❌ An error occurred while joining your PDF files. Please try again later.')
    }
    finally {
      const cleanup = [...paths, outputPath, outputDir]
      await Promise.all(cleanup.map(p => fs.rm(p, { force: true, recursive: true }).catch(() => { })))

      this.clearSession(ctx)
    }
  }
}

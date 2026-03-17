import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { InputFile } from 'grammy'
import muhammara from 'muhammara'
import { CommandEnum } from '../enums/command.enum'
import { JoinParamsSchema } from '../schemas/join-params.schema'
import { BaseHandler } from './base.handler'

export class JoinHandler extends BaseHandler {
  readonly command = CommandEnum.Join
  readonly description = 'Join multiple PDF files into one'
  static readonly MAX_PDF_FILES = 10
  readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      const params = this.validateParams(JoinParamsSchema, ctx.session.params)

      if (params.paths.length >= JoinHandler.MAX_PDF_FILES) {
        await ctx.reply(`⚠️ You have reached the limit of ${JoinHandler.MAX_PDF_FILES} PDF files. Please type "done" to merge them or start over.`)
        return
      }

      if (ctx.message?.document?.mime_type !== 'application/pdf') {
        await ctx.reply('⚠️ Please send only PDF files.')
        return
      }

      const file = await ctx.getFile()
      const filePath = await file.download()

      params.paths.push(filePath)
      ctx.session.params = params

      await ctx.reply(
        `📎 File "${ctx.message?.document?.file_name || 'file'}" received.\n\n`
        + `You have sent ${params.paths.length}/${JoinHandler.MAX_PDF_FILES} file(s) so far.\n`
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
    await this.setSessionCommand(ctx)
    ctx.session.params = { paths: [] }
    await ctx.reply(
      '📎 Send the PDF files you want to join.\n\n'
      + `Send up to ${JoinHandler.MAX_PDF_FILES} files one by one.\n`
      + 'When done, type "done" to merge them.',
    )
  }

  private async joinPDFs(ctx: CustomContext) {
    const { paths } = this.validateParams(JoinParamsSchema, ctx.session.params)

    if (paths.length < 2) {
      await ctx.reply('⚠️ You need to send at least two PDF files to join them. Please send more files.')
      return
    }

    const outputDir = await fs.mkdtemp(join(os.tmpdir(), 'pdf-studio-bot-join-'))
    await fs.chmod(outputDir, 0o700)
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
      const cleanup = [...paths, outputDir]
      await Promise.all(cleanup.map(p => fs.rm(p, { force: true, recursive: true }).catch(error =>
        this.logger.error({ error, path: p }, 'Failed to remove temporary file/folder.'))))

      await this.resetSession(ctx)
    }
  }
}

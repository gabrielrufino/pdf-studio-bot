import type { CustomContext } from '../config/bot'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { InputFile } from 'grammy'
import muhammara from 'muhammara'
import { CommandEnum } from '../enums/command.enum'
import { BaseHandler } from './base.handler'

export class SplitHandler extends BaseHandler {
  readonly command = CommandEnum.Split
  readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      const file = await ctx.getFile()
      const inputPath = await file.download()

      const pdfReader = muhammara.createReader(inputPath)
      const pagesCount = pdfReader.getPagesCount()

      const outputDir = await fs.mkdtemp(join(os.tmpdir(), 'pdf-studio-bot-split-'))

      ctx.reply(`📄 Found ${pagesCount} pages. Splitting...`)

      const outputFiles: string[] = []

      for (let i = 0; i < pagesCount; i++) {
        const outPath = join(outputDir, `page-${String(i + 1).padStart(3, '0')}.pdf`)

        const pdfWriter = muhammara.createWriter(outPath)
        const copyingContext = pdfWriter.createPDFCopyingContext(inputPath)

        copyingContext.appendPDFPageFromPDF(i)
        pdfWriter.end()

        outputFiles.push(outPath)
      }

      for (let i = 0; i < outputFiles.length; i++) {
        const pageFile = new InputFile(outputFiles[i], `page-${i + 1}.pdf`)
        await ctx.replyWithDocument(pageFile, {
          caption: `📄 Page ${i + 1} of ${pagesCount}`,
        })
      }
    },
  }

  async onCommand(ctx: CustomContext): Promise<void> {
    this.setSessionCommand(ctx)
    await ctx.reply('Please send the PDF file you want to split.')
  }
}

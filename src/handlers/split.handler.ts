import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { InputFile } from 'grammy'
import muhammara from 'muhammara'
import { CommandEnum } from '../enums/command.enum'
import { BaseHandler } from './base.handler'

export class SplitHandler extends BaseHandler {
  readonly command = CommandEnum.Split
  readonly description = '✂️ Split a PDF into individual pages'
  readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      await this.validatePDF(ctx)

      let outputDir: string | undefined
      let inputPath: string | undefined

      try {
        const file = await ctx.getFile()
        inputPath = await file.download()

        if (!inputPath) {
          throw new Error('Failed to download file')
        }

        const pdfReader = muhammara.createReader(inputPath)
        const pagesCount = pdfReader.getPagesCount()

        outputDir = await fs.mkdtemp(join(os.tmpdir(), 'pdf-studio-bot-split-'))
        await fs.chmod(outputDir, 0o700)

        await ctx.reply(`📄 Found ${pagesCount} pages. Splitting...`)

        const outputFiles = Array.from({ length: pagesCount }, (_, i) => {
          const outPath = join(outputDir!, `page-${String(i + 1).padStart(3, '0')}.pdf`)

          const pdfWriter = muhammara.createWriter(outPath)

          pdfWriter
            .createPDFCopyingContext(inputPath!)
            .appendPDFPageFromPDF(i)

          pdfWriter.end()

          return outPath
        })

        for (const [index, outputPath] of outputFiles.entries()) {
          const pageNumber = index + 1
          const pageFile = new InputFile(outputPath, `page-${pageNumber}.pdf`)

          await ctx.replyWithDocument(pageFile, {
            caption: `📄 Page ${pageNumber} of ${pagesCount}`,
          })
        }
      }
      catch (error) {
        this.logger.error(error)
        await ctx.reply('❌ An error occurred while splitting the PDF file.')
      }
      finally {
        if (outputDir) {
          await fs.rm(outputDir, { force: true, recursive: true }).catch(error =>
            this.logger.error({ error, path: outputDir }, 'Failed to remove temporary folder.'))
        }
        if (inputPath) {
          await fs.rm(inputPath, { force: true, recursive: true }).catch(error =>
            this.logger.error({ error, path: inputPath }, 'Failed to remove input file.'))
        }
        await this.resetSession(ctx)
      }
    },
  }

  async onCommand(ctx: CustomContext): Promise<void> {
    await this.setSessionCommand(ctx)
    await ctx.reply('Please send the PDF file you want to split.')
  }
}

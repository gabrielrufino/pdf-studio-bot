import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { InputFile } from 'grammy'
import { CommandEnum } from '../enums/command.enum'
import { BaseHandler } from './base.handler'

const execFilePromise = promisify(execFile)

export class ToDocxHandler extends BaseHandler {
  constructor(private readonly userRepository: UserRepository) {
    super()
  }

  readonly command = CommandEnum.ToDocx
  readonly description = '📝 Convert a PDF to a DOCX file'
  readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      await this.validatePDF(ctx)

      let outputDir: string | undefined
      let inputPath: string | undefined

      try {
        outputDir = await fs.mkdtemp(join(os.tmpdir(), 'pdf-studio-bot-todocx-'))
        await fs.chmod(outputDir, 0o700)

        const file = await ctx.getFile()
        const downloadedPath = await file.download()

        if (!downloadedPath) {
          throw new Error('Failed to download file')
        }

        inputPath = downloadedPath
        const outputPath = join(outputDir, 'output.docx')

        await ctx.reply('🔄 Converting your PDF to DOCX. This might take a moment...')

        const pythonScript = resolve(__dirname, '../utils/convert_pdf_to_docx.py')
        await execFilePromise('python3', [pythonScript, inputPath, outputPath])

        const originalFileName = ctx.message?.document?.file_name || 'document.pdf'
        const outputFileName = originalFileName.replace(/\.pdf$/i, '') + '.docx'

        await ctx.replyWithDocument(new InputFile(outputPath, outputFileName), {
          caption: '✅ Here is your DOCX file!',
        })

        await this.userRepository.incrementUsage(ctx.from!.id)
      }
      catch (error) {
        this.logger.error(error)
        await ctx.reply('❌ An error occurred while converting the PDF to DOCX.')
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
    await ctx.reply('Please send the PDF file you want to convert to DOCX.')
  }
}

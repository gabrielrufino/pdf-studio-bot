import type { GoogleGenAI } from '@google/genai'
import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import muhammara from 'muhammara'
import { CommandEnum } from '../enums/command.enum'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { BaseHandler } from './base.handler'

export class SummaryHandler extends BaseHandler {
  public readonly command = CommandEnum.Summary
  public readonly description = 'Create a summary of a PDF'

  public static MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  public static MAX_PAGES = 50

  constructor(
    private readonly userRepository: UserRepository,
    private readonly ai: GoogleGenAI,
  ) {
    super()
  }

  public readonly events = {
    'msg:document': async (ctx: CustomContext) => {
      await this.validatePDF(ctx)

      const file = await ctx.getFile()
      const inputPath = await file.download()
      let uploadedFileName: string | undefined

      try {
        const user = await this.userRepository.findByTelegramId(ctx.from!.id)
        if (!user) {
          throw new Error('User not found.')
        }

        const isPro = user.plan_type === PlanTypeEnum.Pro

        if (!isPro) {
          const stats = await fs.stat(inputPath)
          let limitExceeded = stats.size > SummaryHandler.MAX_FILE_SIZE

          if (!limitExceeded) {
            const pdfReader = muhammara.createReader(inputPath)
            const pagesCount = pdfReader.getPagesCount()
            if (pagesCount > SummaryHandler.MAX_PAGES) {
              limitExceeded = true
            }
          }

          if (limitExceeded) {
            await ctx.reply('⚠️ You have exceeded the limits of the free plan. You need to become pro and it costs 10 $ / month. Talk to @gabrielrufino to buy the pro plan.')
            return
          }
        }

        const processingMessage = await ctx.reply('⏳ Summarizing your PDF. This might take a moment...')

        const uploadedFile = await this.ai.files.upload({
          file: inputPath,
          config: {
            mimeType: 'application/pdf',
          },
        })
        uploadedFileName = uploadedFile.name

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { fileData: { fileUri: uploadedFile.uri!, mimeType: uploadedFile.mimeType! } },
                { text: 'Create a concise yet informative summary of this PDF, structured with bullet points. Target length: ~2000 characters.' },
              ],
            },
          ],
        })

        const summaryText = response.text
        if (!summaryText) {
          throw new Error('Summary text is empty.')
        }
        const fullMessage = `📝 **Summary:**\n\n${summaryText}`

        if (fullMessage.length <= 4096) {
          await ctx.api.editMessageText(
            ctx.chat!.id,
            processingMessage.message_id,
            fullMessage,
            { parse_mode: 'Markdown' },
          )
        }
        else {
          await ctx.api.editMessageText(
            ctx.chat!.id,
            processingMessage.message_id,
            '✅ Summary complete! It is quite long, sending it in parts below:',
          )

          const chunks = this.splitMessage(summaryText)
          for (const chunk of chunks) {
            await ctx.reply(chunk, { parse_mode: 'Markdown' })
          }
        }
      }
      catch (error) {
        this.logger.error(error)
        await ctx.reply('❌ An error occurred while summarizing the PDF file.')
      }
      finally {
        if (uploadedFileName) {
          await this.ai.files.delete({ name: uploadedFileName }).catch(error =>
            this.logger.error({ error, name: uploadedFileName }, 'Failed to remove remote file.'),
          )
        }
        await fs.rm(inputPath, { force: true }).catch(error =>
          this.logger.error({ error, path: inputPath }, 'Failed to remove input file.'),
        )
        await this.resetSession(ctx)
      }
    },
  }

  public async onCommand(ctx: CustomContext): Promise<void> {
    await this.setSessionCommand(ctx)
    await ctx.reply('Please send the PDF file you want to summarize.')
  }

  private splitMessage(text: string, maxLength = 4000): string[] {
    const chunks: string[] = []
    let currentChunk = ''

    const lines = text.split('\n')
    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk)
          currentChunk = line
        }
        else {
          // Line itself is too long, must truncate/split line
          let remainingLine = line
          while (remainingLine.length > maxLength) {
            chunks.push(remainingLine.slice(0, maxLength))
            remainingLine = remainingLine.slice(maxLength)
          }
          currentChunk = remainingLine
        }
      }
      else {
        currentChunk += (currentChunk ? '\n' : '') + line
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk)
    }

    return chunks
  }
}

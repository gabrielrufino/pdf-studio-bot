import type { GoogleGenAI } from '@google/genai'
import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import muhammara from 'muhammara'
import { CommandEnum } from '../enums/command.enum'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { LimitExceededError } from '../errors/limit-exceeded.error'
import { UserNotFoundError } from '../errors/user-not-found.error'
import { BaseHandler } from './base.handler'

export class SummaryHandler extends BaseHandler {
  public readonly command = CommandEnum.Summary
  public readonly description = '⚡ Create a summary of a PDF'

  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  private static readonly MAX_PAGES = 50

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
        await this.verifyLimits(ctx, inputPath)

        const processingMessage = await ctx.reply('⏳ Summarizing your PDF. This might take a moment...')

        const { text, fileName } = await this.performSummarization(inputPath)
        uploadedFileName = fileName

        await this.sendSummaryResponse(ctx, processingMessage.message_id, text)
      }
      catch (error) {
        if (error instanceof LimitExceededError)
          return

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

  private async verifyLimits(ctx: CustomContext, path: string): Promise<void> {
    const user = await this.userRepository.findByTelegramId(ctx.from!.id)
    if (!user)
      throw new UserNotFoundError()
    if (user.plan_type === PlanTypeEnum.Pro)
      return

    const stats = await fs.stat(path)
    if (stats.size > SummaryHandler.MAX_FILE_SIZE) {
      await this.notifyLimitExceeded(ctx)
      throw new LimitExceededError()
    }

    const pdfReader = muhammara.createReader(path)
    if (pdfReader.getPagesCount() > SummaryHandler.MAX_PAGES) {
      await this.notifyLimitExceeded(ctx)
      throw new LimitExceededError()
    }
  }

  private async notifyLimitExceeded(ctx: CustomContext): Promise<void> {
    await ctx.reply('⚠️ You have exceeded the limits of the free plan. You need to become pro and it costs 10 $ / month. Talk to @gabrielrufino to buy the pro plan.')
  }

  private async performSummarization(path: string): Promise<{ text: string, fileName: string }> {
    const uploadedFile = await this.ai.files.upload({
      file: path,
      config: { mimeType: 'application/pdf' },
    })

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

    if (!response.text)
      throw new Error('Summary text is empty.')

    if (!uploadedFile.name)
      throw new Error('Uploaded file name is missing.')

    return { text: response.text, fileName: uploadedFile.name }
  }

  private async sendSummaryResponse(ctx: CustomContext, messageId: number, text: string): Promise<void> {
    const fullMessage = `📝 **Summary:**\n\n${text}`

    if (fullMessage.length <= 4096) {
      await ctx.api.editMessageText(ctx.chat!.id, messageId, fullMessage, { parse_mode: 'Markdown' })
      return
    }

    await ctx.api.editMessageText(ctx.chat!.id, messageId, '✅ Summary complete! It is quite long, sending it in parts below:')
    const chunks = this.splitMessage(text)
    for (const chunk of chunks) {
      await ctx.reply(chunk, { parse_mode: 'Markdown' })
    }
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

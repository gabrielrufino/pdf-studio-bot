import type { GoogleGenAI } from '@google/genai'
import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { SummaryHandler } from './summary.handler'

const mockGenerateContent = vi.fn()
const mockUpload = vi.fn().mockResolvedValue({ name: 'mock-file-name', uri: 'mock-uri', mimeType: 'application/pdf' })
const mockDelete = vi.fn().mockResolvedValue({})

const mockAi = {
  models: {
    generateContent: mockGenerateContent,
  },
  files: {
    upload: mockUpload,
    delete: mockDelete,
  },
} as unknown as GoogleGenAI

describe(SummaryHandler.name, () => {
  const mockUserRepository = {
    findByTelegramId: vi.fn(),
  } as unknown as UserRepository

  const handler = new SummaryHandler(mockUserRepository, mockAi)

  let ctx: CustomContext

  beforeEach(() => {
    vi.clearAllMocks()

    ctx = {
      from: { id: 123 },
      chat: { id: 456 },
      session: {
        command: null,
        params: {} as any,
      },
      message: {
        document: {
          mime_type: 'application/pdf',
        },
      },
      getFile: vi.fn().mockResolvedValue({
        download: vi.fn().mockResolvedValue('/tmp/fake.pdf'),
      }),
      reply: vi.fn().mockResolvedValue({ message_id: 789 }),
      api: {
        editMessageText: vi.fn(),
      },
    } as unknown as CustomContext
  })
  
  const setupTestFile = async (prefix: string) => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
    const targetPath = path.join(tempDir, 'test.pdf')
    await fs.copyFile(`${process.cwd()}/assets/lorem-ipsum.pdf`, targetPath)
    vi.mocked(ctx.getFile).mockResolvedValue({
      download: vi.fn().mockResolvedValue(targetPath),
    } as any)
    return { tempDir, targetPath }
  }

  const mockUserWithPlan = (plan: PlanTypeEnum) => {
    vi.mocked(mockUserRepository.findByTelegramId).mockResolvedValue({
      telegram_user: { id: 123 },
      plan_type: plan,
    } as any)
  }

  it('should have correct command', () => {
    expect(handler.command).toBe(CommandEnum.Summary)
  })

  describe(SummaryHandler.prototype.onCommand.name, () => {
    it('should set session command and ask for PDF file', async () => {
      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('Please send the PDF file you want to summarize.')
      expect(ctx.session.command).toBe(CommandEnum.Summary)
    })
  })

  describe('events', () => {
    describe('msg:document', () => {
      it('should return error if user not found', async () => {
        vi.mocked(mockUserRepository.findByTelegramId).mockResolvedValueOnce(null)

        await handler.events['msg:document'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('❌ An error occurred while summarizing the PDF file.')
      })

      it('should summarize PDF if constraints are respected and user is free', async () => {
        const { tempDir, targetPath } = await setupTestFile('pdf-studio-bot-test-summary-')

        try {
          mockUserWithPlan(PlanTypeEnum.Free)

          mockGenerateContent.mockResolvedValueOnce({
            text: 'This is a mock summary of the PDF.',
          })

          await handler.events['msg:document'](ctx)

          // Since page-1.pdf has 10 pages and <10MB, it should pass limits.
          expect(ctx.reply).toHaveBeenCalledWith('⏳ Summarizing your PDF. This might take a moment...')
          expect(mockUpload).toHaveBeenCalledWith({
            file: targetPath,
            config: {
              mimeType: 'application/pdf',
            },
          })
          expect(mockGenerateContent).toHaveBeenCalledWith({
            model: 'gemini-2.5-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  { fileData: { fileUri: 'mock-uri', mimeType: 'application/pdf' } },
                  { text: 'Create a concise yet informative summary of this PDF, structured with bullet points. Target length: ~2000 characters.' },
                ],
              },
            ],
          })
          expect(ctx.api.editMessageText).toHaveBeenCalledWith(
            456,
            789,
            '📝 **Summary:**\n\nThis is a mock summary of the PDF.',
            { parse_mode: 'Markdown' },
          )
          expect(mockDelete).toHaveBeenCalledWith({ name: 'mock-file-name' })
        }
        finally {
          await fs.rm(tempDir, { recursive: true, force: true })
        }
      })

      it('should summarize PDF for pro user ignoring limits', async () => {
        const { tempDir } = await setupTestFile('pdf-studio-bot-test-summary-pro-')

        try {
          mockUserWithPlan(PlanTypeEnum.Pro)

          mockGenerateContent.mockResolvedValueOnce({
            text: 'This is a mock summary of the PDF.',
          })

          const statSpy = vi.spyOn(fs, 'stat')

          await handler.events['msg:document'](ctx)

          expect(statSpy).not.toHaveBeenCalled()
          expect(mockGenerateContent).toHaveBeenCalled()
        }
        finally {
          await fs.rm(tempDir, { recursive: true, force: true })
        }
      })

      it('should enforce size limit for free users', async () => {
        const { tempDir } = await setupTestFile('pdf-studio-bot-test-summary-size-')

        const statSpy = vi.spyOn(fs, 'stat')

        try {
          mockUserWithPlan(PlanTypeEnum.Free)

          statSpy.mockResolvedValueOnce({ size: 15 * 1024 * 1024 } as any) // 15MB

          await handler.events['msg:document'](ctx)

          expect(ctx.reply).toHaveBeenCalledWith('⚠️ You have exceeded the limits of the free plan. You need to become pro and it costs 10 $ / month. Talk to @gabrielrufino to buy the pro plan.')
          expect(mockGenerateContent).not.toHaveBeenCalled()
        }
        finally {
          statSpy.mockRestore()
          await fs.rm(tempDir, { recursive: true, force: true })
        }
      })

      it('should split long summaries into multiple messages', async () => {
        const { tempDir } = await setupTestFile('pdf-studio-bot-test-summary-long-')

        try {
          mockUserWithPlan(PlanTypeEnum.Pro)

          const longSummary = 'A'.repeat(5000)
          mockGenerateContent.mockResolvedValueOnce({
            text: longSummary,
          })

          await handler.events['msg:document'](ctx)

          expect(ctx.api.editMessageText).toHaveBeenCalledWith(
            456,
            789,
            '✅ Summary complete! It is quite long, sending it in parts below:',
          )

          // 5000 chars should split into 2 chunks (maxLength=4000)
          // Total replies: 1 (processing) + 2 (chunks) = 3
          expect(ctx.reply).toHaveBeenCalledTimes(3)
          expect(ctx.reply).toHaveBeenNthCalledWith(2, 'A'.repeat(4000), { parse_mode: 'Markdown' })
          expect(ctx.reply).toHaveBeenNthCalledWith(3, 'A'.repeat(1000), { parse_mode: 'Markdown' })
        }
        finally {
          await fs.rm(tempDir, { recursive: true, force: true })
        }
      })
    })
  })
})

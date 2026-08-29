import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'

import { PDFParse } from 'pdf-parse'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '../config/logger'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { ExtractTextHandler } from './extract-text.handler'

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    rm: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('node:os', () => ({
  default: {
    tmpdir: vi.fn().mockReturnValue('/tmp'),
  },
}))

vi.mock('pdf-parse', () => ({
  PDFParse: class {
    getText() {
      return Promise.resolve('extracted text')
    }
  },
}))

vi.mock('grammy', () => ({
  InputFile: vi.fn(),
}))

vi.mock('../config/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

describe('extractTextHandler', () => {
  let userRepository: UserRepository
  let handler: ExtractTextHandler
  let ctx: any

  beforeEach(() => {
    userRepository = { incrementUsage: vi.fn() } as unknown as UserRepository
    handler = new ExtractTextHandler(userRepository)

    ctx = {
      from: { id: 123 },
      user: {
        id: 123,
        plan_type: PlanTypeEnum.Free,
        daily_usage_count: 0,
        is_blocked: false,
        last_usage_date: new Date(),
      },
      t: vi.fn(key => key),
      reply: vi.fn(),
      replyWithDocument: vi.fn(),
      getFile: vi.fn().mockResolvedValue({ download: vi.fn().mockResolvedValue('/tmp/input.pdf') }),
      session: { params: {} },
      message: { document: { mime_type: 'application/pdf', file_size: 100 } },
    } as unknown as CustomContext
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('onCommand', () => {
    it('should ask for file', async () => {
      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('extracttext_send_file')
      expect(ctx.session.command).toBe(handler.command)
    })
  })

  describe('events', () => {
    describe('msg:document', () => {
      it('should successfully extract text and send the document', async () => {
        vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('pdf data'))

        const downloadMock = vi.fn().mockResolvedValue('/tmp/input.pdf')
        ctx.getFile = vi.fn().mockResolvedValue({ download: downloadMock })

        await handler.events['msg:document']!(ctx)

        expect(ctx.reply).toHaveBeenCalledWith('extracttext_extracting')

        expect(fs.writeFile).toHaveBeenCalledWith(expect.stringMatching(/\/tmp\/extract-text-\d+\.txt/), 'extracted text')
        expect(ctx.replyWithDocument).toHaveBeenCalledWith(expect.any(Object), { caption: 'extracttext_success' })
        expect(userRepository.incrementUsage).toHaveBeenCalledWith(123)
        expect(fs.rm).toHaveBeenCalledWith('/tmp/input.pdf', { force: true, recursive: true })
        expect(fs.rm).toHaveBeenCalledWith(expect.stringMatching(/\/tmp\/extract-text-\d+\.txt/), { force: true, recursive: true })
        expect(ctx.session.command).toBeNull()
        expect(ctx.session.params).toBeNull()
      })

      it('should reply with error when user not found', async () => {
        ctx.user = null
        await handler.events['msg:document']!(ctx)

        expect(logger.error).toHaveBeenCalled()
        expect(ctx.reply).toHaveBeenCalledWith('extracttext_error')
      })

      it('should return silently on InvalidFileError', async () => {
        ctx.message.document.mime_type = 'image/png'
        await handler.events['msg:document']!(ctx)

        expect(ctx.reply).toHaveBeenCalledWith('invalid_pdf')
        expect(logger.error).not.toHaveBeenCalled()
        expect(ctx.reply).not.toHaveBeenCalledWith('extracttext_error')
      })

      it('should return silently on LimitExceededError', async () => {
        ctx.message.document.file_size = 99999999999 // exceed MAX_FILE_SIZE
        await handler.events['msg:document']!(ctx)

        expect(ctx.reply).toHaveBeenCalledWith('free_limit_reached')
        expect(logger.error).not.toHaveBeenCalled()
        expect(ctx.reply).not.toHaveBeenCalledWith('extracttext_error')
      })

      it('should throw error when file download fails', async () => {
        ctx.getFile = vi.fn().mockResolvedValue({ download: vi.fn().mockResolvedValue(undefined) })

        await handler.events['msg:document']!(ctx)

        expect(logger.error).toHaveBeenCalled()
        expect(ctx.reply).toHaveBeenCalledWith('extracttext_error')
      })

      it('should throw error when text parsing fails or returns non-string', async () => {
        vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('pdf data'))
        const originalGetText = PDFParse.prototype.getText
        PDFParse.prototype.getText = vi.fn().mockResolvedValue(undefined)

        try {
          await handler.events['msg:document']!(ctx)

          expect(logger.error).toHaveBeenCalled()
          expect(ctx.reply).toHaveBeenCalledWith('extracttext_error')
          expect(fs.rm).toHaveBeenCalledWith('/tmp/input.pdf', { force: true, recursive: true })
        }
        finally {
          PDFParse.prototype.getText = originalGetText
        }
      })

      it('should log error when fs.rm fails in finally block', async () => {
        vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('pdf data'))

        const rmError = new Error('rm error')
        vi.mocked(fs.rm).mockRejectedValue(rmError)

        await handler.events['msg:document']!(ctx)

        // Give the un-awaited promises in finally block a tick to resolve
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(logger.error).toHaveBeenCalledWith(
          { error: rmError, path: '/tmp/input.pdf' },
          'Failed to remove temporary file/folder.',
        )
        expect(logger.error).toHaveBeenCalledWith(
          { error: rmError, path: expect.stringMatching(/\/tmp\/extract-text-\d+\.txt/) },
          'Failed to remove temporary file/folder.',
        )
      })
    })
  })
})

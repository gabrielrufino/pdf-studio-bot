import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'

import { PDFDocument } from 'pdf-lib'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '../config/logger'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { CompressHandler } from './compress.handler'

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

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn().mockResolvedValue({
      getPageCount: vi.fn().mockReturnValue(1),
      save: vi.fn().mockResolvedValue(Buffer.from('compressed pdf data')),
    }),
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

describe(CompressHandler.name, () => {
  let userRepository: UserRepository
  let handler: CompressHandler
  let ctx: any

  beforeEach(() => {
    userRepository = {
      incrementUsage: vi.fn().mockResolvedValue({}),
      decrementUsage: vi.fn().mockResolvedValue({}),
    } as unknown as UserRepository
    handler = new CompressHandler(userRepository)

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

  describe(CompressHandler.prototype.onCommand.name, () => {
    it('should ask for file', async () => {
      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('compress_send_file')
      expect(ctx.session.command).toBe(handler.command)
    })
  })

  describe('events', () => {
    describe('msg:document', () => {
      it('should successfully compress PDF and send the document', async () => {
        vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('pdf data'))
        vi.mocked(PDFDocument.load).mockResolvedValue({
          getPageCount: vi.fn().mockReturnValue(1),
          save: vi.fn().mockResolvedValue(Buffer.from('small')),
        } as any)

        const downloadMock = vi.fn().mockResolvedValue('/tmp/input.pdf')
        ctx.getFile = vi.fn().mockResolvedValue({ download: downloadMock })

        await handler.events['msg:document']!(ctx)

        expect(ctx.reply).toHaveBeenCalledWith('compress_compressing')

        expect(fs.writeFile).toHaveBeenCalledWith(expect.stringMatching(/\/tmp\/compress-[a-f0-9-]+\.pdf/), expect.any(Buffer))
        expect(ctx.replyWithDocument).toHaveBeenCalledWith(expect.any(Object), { caption: 'compress_success' })
        expect(userRepository.incrementUsage).toHaveBeenCalledWith(123, 3)
        expect(ctx.session.command).toBeNull()
        expect(ctx.session.params).toBeNull()
      })

      it('should reply with no_reduction message when compressed file is not smaller', async () => {
        vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('pdf data'))
        vi.mocked(PDFDocument.load).mockResolvedValue({
          getPageCount: vi.fn().mockReturnValue(1),
          save: vi.fn().mockResolvedValue(Buffer.from('this is larger than the original file')),
        } as any)

        const downloadMock = vi.fn().mockResolvedValue('/tmp/input.pdf')
        ctx.getFile = vi.fn().mockResolvedValue({ download: downloadMock })

        await handler.events['msg:document']!(ctx)

        expect(ctx.reply).toHaveBeenCalledWith('compress_compressing')
        expect(ctx.reply).toHaveBeenCalledWith('compress_no_reduction')
        expect(ctx.replyWithDocument).not.toHaveBeenCalled()
        expect(userRepository.incrementUsage).toHaveBeenCalledWith(123, 3)
      })

      it('should reply with error when user not found', async () => {
        ctx.user = null
        await handler.events['msg:document']!(ctx)

        expect(logger.error).toHaveBeenCalled()
        expect(ctx.reply).toHaveBeenCalledWith('compress_error')
      })

      it('should return silently on InvalidFileError', async () => {
        ctx.message.document.mime_type = 'image/png'
        await handler.events['msg:document']!(ctx)

        expect(ctx.reply).toHaveBeenCalledWith('invalid_pdf')
        expect(logger.error).not.toHaveBeenCalled()
        expect(ctx.reply).not.toHaveBeenCalledWith('compress_error')
      })

      it('should return silently on LimitExceededError', async () => {
        ctx.message.document.file_size = 99999999999
        await handler.events['msg:document']!(ctx)

        expect(ctx.reply).toHaveBeenCalledWith('free_limit_reached')
        expect(logger.error).not.toHaveBeenCalled()
        expect(ctx.reply).not.toHaveBeenCalledWith('compress_error')
      })

      it('should throw error when file download fails', async () => {
        ctx.getFile = vi.fn().mockResolvedValue({ download: vi.fn().mockResolvedValue(undefined) })

        await handler.events['msg:document']!(ctx)

        expect(logger.error).toHaveBeenCalled()
        expect(ctx.reply).toHaveBeenCalledWith('compress_error')
      })
    })
  })
})

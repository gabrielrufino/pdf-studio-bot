import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import { InlineKeyboard } from 'grammy'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { LimitExceededError } from '../errors/limit-exceeded.error'
import { RotateHandler } from './rotate.handler'

const { mockSetRotation } = vi.hoisted(() => {
  return { mockSetRotation: vi.fn() }
})

vi.mock('pdf-lib', () => ({
  degrees: vi.fn(val => val),
  PDFDocument: {
    load: vi.fn().mockResolvedValue({
      getPageCount: vi.fn().mockReturnValue(1),
      getPages: vi.fn().mockReturnValue([
        { getRotation: vi.fn().mockReturnValue({ angle: 0 }), setRotation: mockSetRotation },
      ]),
      save: vi.fn().mockResolvedValue(Buffer.from('test')),
    }),
  },
}))

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn().mockResolvedValue(Buffer.from('test')),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('rotateHandler', () => {
  let userRepository: UserRepository
  let handler: RotateHandler
  let ctx: CustomContext

  beforeEach(() => {
    userRepository = {
      incrementUsage: vi.fn().mockResolvedValue(undefined),
    } as unknown as UserRepository

    handler = new RotateHandler(userRepository)
    // @ts-expect-error logger is protected
    handler.logger = { error: vi.fn() } as any

    ctx = {
      session: { command: CommandEnum.Rotate, params: null },
      t: vi.fn(key => key),
      user: { id: 1 },
      from: { id: 1 },
      reply: vi.fn().mockResolvedValue(undefined),
      replyWithDocument: vi.fn().mockResolvedValue(undefined),
      editMessageText: vi.fn().mockResolvedValue(undefined),
      answerCallbackQuery: vi.fn().mockResolvedValue(undefined),
      getFile: vi.fn().mockResolvedValue({
        download: vi.fn().mockResolvedValue('/tmp/test.pdf'),
        file_size: 100,
      }),
      api: {
        getFile: vi.fn().mockResolvedValue({
          download: vi.fn().mockResolvedValue('/tmp/test.pdf'),
          file_size: 100,
        }),
      },
      message: { document: { file_id: 'doc-id', file_size: 100, mime_type: 'application/pdf' } },
      callbackQuery: { data: 'rotate_90' },
    } as unknown as CustomContext

    vi.clearAllMocks()
  })

  describe('instantiation', () => {
    it('should match command and description', () => {
      expect(handler.command).toBe(CommandEnum.Rotate)
      expect(handler.description).toBe('🔄 Rotate a PDF file')
    })
  })

  describe('onCommand', () => {
    it('should prompt for file', async () => {
      ctx.session.command = null
      await handler.onCommand(ctx)
      expect(ctx.session.command).toBe(CommandEnum.Rotate)
      expect(ctx.reply).toHaveBeenCalledWith('rotate_send_file')
    })
  })

  describe('msg:document', () => {
    it('should save file_id and show inline keyboard', async () => {
      await handler.events['msg:document'](ctx)
      expect(ctx.session.params).toEqual({ file_id: 'doc-id' })
      expect(ctx.reply).toHaveBeenCalledWith('rotate_choose_degrees', {
        reply_markup: expect.any(InlineKeyboard),
      })
    })

    it('should throw UserNotFoundError if no user', async () => {
      ctx.user = null as any
      await handler.events['msg:document'](ctx)
      expect(ctx.reply).toHaveBeenCalledWith('rotate_error')
    })
  })

  describe('callback_query', () => {
    it('should download, rotate, and send document', async () => {
      ctx.session.params = { file_id: 'doc-id' }
      await handler.events.callback_query(ctx)

      expect(ctx.answerCallbackQuery).toHaveBeenCalled()
      expect(ctx.editMessageText).toHaveBeenCalledWith('rotate_rotating')
      expect(ctx.replyWithDocument).toHaveBeenCalledWith(
        expect.objectContaining({ filename: 'rotated.pdf', fileData: expect.stringMatching(/rotate-\d+\.pdf$/) }),
        { caption: 'rotate_success' },
      )

      expect(mockSetRotation).toHaveBeenCalledWith(90)
      expect(fs.writeFile).toHaveBeenCalledWith(expect.stringMatching(/rotate-\d+\.pdf$/), expect.any(Buffer))
      expect(fs.rm).toHaveBeenCalledWith('/tmp/test.pdf', { force: true })
      expect(fs.rm).toHaveBeenCalledWith(expect.stringMatching(/rotate-\d+\.pdf$/), { force: true })

      expect(userRepository.incrementUsage).toHaveBeenCalledWith(1)
      expect(ctx.session.command).toBeNull()
      expect(ctx.session.params).toBeNull()
    })

    it('should rotate with negative degrees correctly', async () => {
      ctx.session.params = { file_id: 'doc-id' }
      ctx.callbackQuery!.data = 'rotate_-90'
      await handler.events.callback_query(ctx)

      expect(ctx.answerCallbackQuery).toHaveBeenCalled()
      expect(ctx.editMessageText).toHaveBeenCalledWith('rotate_rotating')
      expect(mockSetRotation).toHaveBeenCalledWith(270)
    })

    it('should rotate with 180 degrees correctly', async () => {
      ctx.session.params = { file_id: 'doc-id' }
      ctx.callbackQuery!.data = 'rotate_180'
      await handler.events.callback_query(ctx)

      expect(ctx.answerCallbackQuery).toHaveBeenCalled()
      expect(ctx.editMessageText).toHaveBeenCalledWith('rotate_rotating')
      expect(mockSetRotation).toHaveBeenCalledWith(180)
    })

    it('should throw UserNotFoundError if no user in callback', async () => {
      ctx.user = null as any
      await handler.events.callback_query(ctx)
      expect(ctx.reply).toHaveBeenCalledWith('rotate_error')
    })

    it('should ignore LimitExceededError gracefully', async () => {
      ctx.session.params = { file_id: 'doc-id' }
      vi.spyOn(handler as any, 'checkLimits').mockRejectedValueOnce(new LimitExceededError())

      await handler.events.callback_query(ctx)

      expect(ctx.reply).not.toHaveBeenCalledWith('rotate_error')
    })

    it('should handle fs.rm errors', async () => {
      ctx.session.params = { file_id: 'doc-id' }
      const err1 = new Error('rm input error')
      const err2 = new Error('rm output error')

      vi.mocked(fs.rm).mockRejectedValueOnce(err1).mockRejectedValueOnce(err2)

      await handler.events.callback_query(ctx)

      expect((handler as any).logger.error).toHaveBeenCalledWith({ error: err1, path: '/tmp/test.pdf' }, 'Failed to remove input file.')
      expect((handler as any).logger.error).toHaveBeenCalledWith(
        { error: err2, path: expect.stringMatching(/rotate-\d+\.pdf$/) },
        'Failed to remove output file.',
      )
    })

    it('should ignore non-rotate callbacks', async () => {
      ctx.callbackQuery!.data = 'other'
      await handler.events.callback_query(ctx)
      expect(ctx.editMessageText).not.toHaveBeenCalled()
    })

    it('should handle missing degrees', async () => {
      ctx.callbackQuery!.data = 'rotate_'
      await handler.events.callback_query(ctx)
      expect(ctx.editMessageText).not.toHaveBeenCalled()
    })

    it('should handle invalid degrees', async () => {
      ctx.callbackQuery!.data = 'rotate_45'
      await handler.events.callback_query(ctx)
      expect(ctx.editMessageText).not.toHaveBeenCalled()
    })
  })
})

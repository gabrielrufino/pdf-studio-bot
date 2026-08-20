import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { Buffer } from 'node:buffer'
import { InlineKeyboard } from 'grammy'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { RotateHandler } from './rotate.handler'

vi.mock('pdf-lib', () => ({
  degrees: vi.fn(val => val),
  PDFDocument: {
    load: vi.fn().mockResolvedValue({
      getPageCount: vi.fn().mockReturnValue(1),
      getPages: vi.fn().mockReturnValue([
        { getRotation: vi.fn().mockReturnValue({ angle: 0 }), setRotation: vi.fn() },
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

    ctx = {
      session: { command: CommandEnum.Rotate, params: null },
      t: vi.fn(key => key),
      user: { id: 1 },
      from: { id: 1 },
      reply: vi.fn().mockResolvedValue(undefined),
      replyWithDocument: vi.fn().mockResolvedValue(undefined),
      editMessageText: vi.fn().mockResolvedValue(undefined),
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

      expect(ctx.editMessageText).toHaveBeenCalledWith('rotate_rotating')
      expect(ctx.replyWithDocument).toHaveBeenCalledWith(expect.anything(), {
        caption: 'rotate_success',
      })
      expect(userRepository.incrementUsage).toHaveBeenCalledWith(1)
      expect(ctx.session.command).toBeNull()
      expect(ctx.session.params).toBeNull()
    })

    it('should throw UserNotFoundError if no user in callback', async () => {
      ctx.user = null as any
      await handler.events.callback_query(ctx)
      expect(ctx.reply).toHaveBeenCalledWith('rotate_error')
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

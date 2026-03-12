import type fs from 'node:fs/promises'
import type { Browser } from '../config/browser'
import type { CustomContext } from '../types/custom-context.type'
import { Buffer } from 'node:buffer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { SessionValidationError } from '../errors/session-validation.error'
import { DownloadHandler } from './download.handler'

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof fs>()
  return {
    ...actual,
    mkdtemp: vi.fn().mockResolvedValue('/tmp/pdf-studio-bot-download-test-'),
  }
})

describe(DownloadHandler.name, () => {
  let handler: DownloadHandler
  let ctx: CustomContext
  let mockBrowser: Browser

  beforeEach(() => {
    vi.clearAllMocks()

    mockBrowser = {
      getInstance: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue({}),
          pdf: vi.fn().mockResolvedValue(Buffer.from('test pdf content')),
          title: vi.fn().mockResolvedValue('test title'),
          close: vi.fn().mockResolvedValue({}),
        }),
        close: vi.fn().mockResolvedValue({}),
      }),
    } as unknown as Browser

    handler = new DownloadHandler(mockBrowser)
    ctx = {
      session: {
        command: null,
        params: { url: null },
      },
      message: {
        text: 'https://example.com',
      },
      reply: vi.fn(),
      replyWithDocument: vi.fn(),
    } as unknown as CustomContext
  })

  it('should have correct command', () => {
    expect(handler.command).toBe(CommandEnum.Download)
  })

  describe(DownloadHandler.prototype.onCommand.name, () => {
    it('should set session command and ask for URL', async () => {
      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('🌐 Send me a URL and I\'ll convert it to PDF!'),
      )
      expect(ctx.session.command).toBe(CommandEnum.Download)
      expect(ctx.session.params).toEqual({ url: null })
    })
  })

  describe('events', () => {
    describe('msg:text', () => {
      it('should convert URL to PDF and send it', async () => {
        await handler.events['msg:text'](ctx)

        expect(mockBrowser.getInstance).toHaveBeenCalled()
        expect(ctx.replyWithDocument).toHaveBeenCalled()
        expect(ctx.session.command).toBeNull()
        expect(ctx.session.params).toBeNull()
      })

      it('should throw SessionValidationError if session is invalid', async () => {
        ctx.session.params = null

        await expect(handler.events['msg:text'](ctx)).rejects.toThrow(SessionValidationError)
      })

      it('should throw SessionValidationError if URL is invalid (doesn\'t start with http)', async () => {
        ctx.message!.text = 'file:///etc/passwd'

        await expect(handler.events['msg:text'](ctx)).rejects.toThrow(SessionValidationError)
      })
    })
  })
})

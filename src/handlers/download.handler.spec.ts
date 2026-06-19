import type fs from 'node:fs/promises'
import type { Browser } from '../config/browser'
import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { Buffer } from 'node:buffer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { DownloadHandler } from './download.handler'

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof fs>()
  return {
    ...actual,
    mkdtemp: vi.fn().mockResolvedValue('/tmp/pdf-studio-bot-download-test-'),
  }
})

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn().mockResolvedValue([{ address: '1.1.1.1', family: 4 }]),
  default: {
    lookup: vi.fn().mockResolvedValue([{ address: '1.1.1.1', family: 4 }]),
  },
}))

describe(DownloadHandler.name, () => {
  let handler: DownloadHandler
  let ctx: CustomContext
  let mockBrowser: Browser
  let mockUserRepository: UserRepository

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

    mockUserRepository = {
      incrementUsage: vi.fn(),
    } as unknown as UserRepository

    handler = new DownloadHandler(mockBrowser, mockUserRepository)
    ctx = { t: (key: string) => key, from: { id: 123 }, session: {
      command: null,
      params: { url: null },
    }, message: {
      text: 'https://example.com',
    }, reply: vi.fn(), replyWithDocument: vi.fn() } as unknown as CustomContext
  })

  it('should have correct command', () => {
    expect(handler.command).toBe(CommandEnum.Download)
  })

  describe(DownloadHandler.prototype.onCommand.name, () => {
    it('should set session command and ask for URL', async () => {
      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('download_send_url')
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
        expect(mockUserRepository.incrementUsage).toHaveBeenCalledWith(123)
        expect(ctx.session.command).toBeNull()
        expect(ctx.session.params).toBeNull()
      })

      it('should reply with error if session is invalid', async () => {
        ctx.session.params = null

        await handler.events['msg:text'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('download_error')
      })

      it('should reply with error if URL is invalid (doesn\'t start with http)', async () => {
        ctx.message!.text = 'file:///etc/passwd'

        await handler.events['msg:text'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('download_error')
      })

      it('should work with http protocol', async () => {
        ctx.message!.text = 'http://example.com'
        await handler.events['msg:text'](ctx)

        expect(ctx.replyWithDocument).toHaveBeenCalled()
      })

      it('should handle errors during conversion', async () => {
        const error = new Error('Navigation failed')
        const mockPage = await (await mockBrowser.getInstance()).newPage()
        vi.spyOn(mockPage, 'goto').mockRejectedValue(error)
        const loggerSpy = vi.spyOn((handler as any).logger, 'error')

        await handler.events['msg:text'](ctx)

        expect(loggerSpy).toHaveBeenCalledWith(error)
        expect(ctx.reply).toHaveBeenCalledWith('download_error')
        expect(mockPage.close).toHaveBeenCalled()
      })

      it('should block private IP hostname', async () => {
        const ip = ['127', '0', '0', '1'].join('.')
        ctx.message!.text = `http://${ip}`

        await handler.events['msg:text'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('download_error')
      })

      it('should block URL that resolves to private IP', async () => {
        ctx.message!.text = 'http://private-host.com'
        const dns = await import('node:dns/promises')
        const ip = ['10', '0', '0', '1'].join('.')
        vi.mocked(dns.default.lookup).mockResolvedValueOnce([{ address: ip, family: 4 }] as any)

        await handler.events['msg:text'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('download_error')
      })

      it('should block IPv6 private IP hostname', async () => {
        const ip = ['fc00', '::1'].join('')
        ctx.message!.text = `http://[${ip}]`

        await handler.events['msg:text'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('download_error')
      })

      it('should block localhost IPv6 hostname', async () => {
        const ip = [':', ':1'].join('')
        ctx.message!.text = `http://[${ip}]`

        await handler.events['msg:text'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('download_error')
      })

      it('should block URL that resolves to an IPv6 private IP', async () => {
        ctx.message!.text = 'http://private-host.com'
        const dns = await import('node:dns/promises')
        const ip = ['fd00', '::1'].join('')
        vi.mocked(dns.default.lookup).mockResolvedValueOnce([{ address: ip, family: 6 }] as any)

        await handler.events['msg:text'](ctx)

        expect(ctx.reply).toHaveBeenCalledWith('download_error')
      })
    })
  })
})

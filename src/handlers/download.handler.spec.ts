import type fs from 'node:fs/promises'
import type { HTTPRequest } from 'puppeteer'
import type { Browser } from '../config/browser'
import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { Buffer } from 'node:buffer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { DownloadHandler } from './download.handler'

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof fs>()
  return {
    ...actual,
    mkdtemp: vi.fn().mockResolvedValue('/tmp/pdf-studio-bot-download-test-'),
  }
})

vi.mock('node:dns/promises', () => {
  const ip = ['1', '1', '1', '1'].join('.')
  return {
    lookup: vi.fn().mockResolvedValue([{ address: ip, family: 4 }]),
    default: {
      lookup: vi.fn().mockResolvedValue([{ address: ip, family: 4 }]),
    },
  }
})

describe(DownloadHandler.name, () => {
  let handler: DownloadHandler
  let ctx: CustomContext
  let mockBrowser: Browser
  let mockUserRepository: UserRepository

  beforeEach(async () => {
    vi.clearAllMocks()

    // Ensure the DNS mock always returns a public IP by default, regardless of previous test modifications.
    const dns = await import('node:dns/promises')
    ;(vi.mocked(dns.default.lookup) as ReturnType<typeof vi.fn>).mockResolvedValue([{ address: '1.1.1.1', family: 4 }])

    mockBrowser = {
      getInstance: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          setRequestInterception: vi.fn().mockResolvedValue(undefined),
          on: vi.fn(),
          goto: vi.fn().mockResolvedValue({}),
          pdf: vi.fn().mockResolvedValue(Buffer.from('test pdf content')),
          title: vi.fn().mockResolvedValue('test title'),
          close: vi.fn().mockResolvedValue({}),
        }),
        close: vi.fn().mockResolvedValue({}),
      }),
    } as unknown as Browser

    mockUserRepository = {
      incrementUsage: vi.fn().mockResolvedValue({}),
      decrementUsage: vi.fn().mockResolvedValue({}),
    } as unknown as UserRepository

    handler = new DownloadHandler(mockBrowser, mockUserRepository)
    ctx = { t: (key: string) => key, from: { id: 123 }, session: {
      command: null,
      params: { url: null },
    }, message: {
      text: 'https://example.com',
    }, reply: vi.fn(), replyWithDocument: vi.fn() } as unknown as CustomContext
  })

  const setUrl = (url: string) => {
    if (ctx.message) {
      ctx.message.text = url
    }
  }

  const createDirectPdfResponse = () => ({
    ok: true,
    arrayBuffer: vi.fn().mockResolvedValue(Buffer.from('pdf bytes')),
    headers: new Map(),
    status: 200,
  })

  const mockFetch = (response: object) => {
    const fetchMock = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  const runEvent = () => handler.events['msg:text'](ctx)

  afterEach(async () => {
    vi.unstubAllGlobals()

    // Reset DNS mock state left over from tests that override it.
    const dns = await import('node:dns/promises')
    ;(vi.mocked(dns.default.lookup) as ReturnType<typeof vi.fn>).mockResolvedValue([{ address: '1.1.1.1', family: 4 }])
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
      describe('direct PDF download', () => {
        it.each([
          ['direct PDF', 'https://example.com/document.pdf', 'document.pdf'],
          ['uppercase PDF', 'https://example.com/document.PDF', 'document.PDF'],
          ['PDF with query params', 'https://example.com/report.pdf?v=1&token=abc', 'report.pdf'],
        ])('should download %s', async (_, url, expectedFilename) => {
          setUrl(url)
          const fetchMock = mockFetch(createDirectPdfResponse())

          await runEvent()

          expect(fetchMock).toHaveBeenCalledWith(url, { redirect: 'manual' })
          expect(mockBrowser.getInstance).not.toHaveBeenCalled()
          expect(ctx.replyWithDocument).toHaveBeenCalledWith(
            expect.objectContaining({ filename: expectedFilename }),
          )
          expect(mockUserRepository.incrementUsage).toHaveBeenCalledWith(123, 3)
        })
      })

      describe('redirect handling', () => {
        it('should follow a single HTTP redirect for PDF download', async () => {
          setUrl('https://example.com/redirect.pdf')
          const firstResponse = {
            ok: true,
            status: 302,
            headers: new Map<string, string>([['location', 'https://cdn.example.com/final.pdf']]),
          }
          const secondResponse = {
            ok: true,
            arrayBuffer: vi.fn().mockResolvedValue(Buffer.from('pdf bytes')),
            headers: new Map(),
            status: 200,
          }
          const fetchMock = vi.fn().mockResolvedValueOnce(firstResponse).mockResolvedValueOnce(secondResponse)
          vi.stubGlobal('fetch', fetchMock)

          await runEvent()

          expect(fetchMock).toHaveBeenCalledTimes(2)
          expect(fetchMock).toHaveBeenLastCalledWith('https://cdn.example.com/final.pdf', { redirect: 'manual' })
          expect(mockBrowser.getInstance).not.toHaveBeenCalled()
          expect(ctx.replyWithDocument).toHaveBeenCalled()
        })

        it('should reply with error when too many redirects occur', async () => {
          setUrl('https://example.com/chase.pdf')
          const redirectUrl = 'https://example.com/loop.pdf'
          const redirectResponse = {
            ok: true,
            status: 302,
            headers: new Map<string, string>([['location', redirectUrl]]),
          }
          const fetchMock = vi.fn().mockResolvedValue(redirectResponse)
          vi.stubGlobal('fetch', fetchMock)

          await runEvent()

          expect(fetchMock).toHaveBeenCalledTimes(5)
          expect(ctx.reply).toHaveBeenCalledWith('download_error')
          expect(mockBrowser.getInstance).not.toHaveBeenCalled()
        })

        it('should reject downloads with non-HTTP(S) redirect targets', async () => {
          setUrl('https://example.com/redirect.pdf')
          const fetchMock = mockFetch({
            ok: true,
            status: 302,
            headers: new Map<string, string>([['location', 'ftp://evil.com/file.pdf']]),
          })

          await runEvent()

          expect(fetchMock).toHaveBeenCalledTimes(1)
          expect(ctx.reply).toHaveBeenCalledWith('download_error')
          expect(mockBrowser.getInstance).not.toHaveBeenCalled()
        })

        it('should reject downloads exceeding max file size', async () => {
          setUrl('https://example.com/huge.pdf')
          mockFetch({
            ok: true,
            headers: new Map<string, string>([['content-length', '60000000']]),
            status: 200,
          })

          await runEvent()

          expect(ctx.reply).toHaveBeenCalledWith('download_error')
          expect(mockBrowser.getInstance).not.toHaveBeenCalled()
        })

        it('should reply with error when direct PDF download fails', async () => {
          setUrl('https://example.com/missing.pdf')
          mockFetch({
            ok: false,
            statusText: 'Not Found',
            headers: new Map(),
            status: 404,
          })

          await runEvent()

          expect(ctx.reply).toHaveBeenCalledWith('download_error')
          expect(mockBrowser.getInstance).not.toHaveBeenCalled()
        })
      })

      describe('ssrf protection for direct PDF downloads', () => {
        it('should reject .pdf URLs with private IP host', async () => {
          setUrl('https://127.0.0.1/file.pdf')
          // Set up a fetch mock; validateUrl will reject the direct IP before fetch is called.
          mockFetch(createDirectPdfResponse())

          await runEvent()

          // validateUrl rejects direct private IPs before fetch is called.
          expect(ctx.reply).toHaveBeenCalledWith('download_error')
          expect(mockBrowser.getInstance).not.toHaveBeenCalled()
        })

        it('should reject .pdf URL that resolves to private IP', async () => {
          setUrl('https://private-host.com/file.pdf')
          const dns = await import('node:dns/promises')
          ;(vi.mocked(dns.default.lookup) as ReturnType<typeof vi.fn>).mockResolvedValue([{ address: '10.0.0.1', family: 4 }])
          mockFetch(createDirectPdfResponse())

          await runEvent()

          expect(ctx.reply).toHaveBeenCalledWith('download_error')
          expect(mockBrowser.getInstance).not.toHaveBeenCalled()
        })

        it('should reject public .pdf URL that redirects to private target', async () => {
          setUrl('https://example.com/redirect.pdf')
          const redirectResponse = {
            ok: true,
            status: 302,
            headers: new Map<string, string>([['location', 'http://127.0.0.1/malicious.pdf']]),
          }
          const fetchMock = vi.fn().mockResolvedValue(redirectResponse)
          vi.stubGlobal('fetch', fetchMock)

          await runEvent()

          expect(fetchMock).toHaveBeenCalledTimes(1)
          expect(ctx.reply).toHaveBeenCalledWith('download_error')
          expect(mockBrowser.getInstance).not.toHaveBeenCalled()
        })

        it('should reject .pdf URL that redirects through multiple hops to a private IP', async () => {
          setUrl('https://example.com/final.pdf')
          const firstRedirect = {
            ok: true,
            status: 302,
            headers: new Map<string, string>([['location', 'https://cdn.example.com/step.pdf']]),
          }
          const secondRedirect = {
            ok: true,
            status: 302,
            headers: new Map<string, string>([['location', 'http://192.168.0.1/internal.pdf']]),
          }
          const fetchMock = vi.fn().mockResolvedValueOnce(firstRedirect).mockResolvedValueOnce(secondRedirect)
          vi.stubGlobal('fetch', fetchMock)

          await runEvent()

          expect(fetchMock).toHaveBeenCalledTimes(2)
          expect(ctx.reply).toHaveBeenCalledWith('download_error')
          expect(mockBrowser.getInstance).not.toHaveBeenCalled()
        })

        it('should reject .pdf URL whose redirect host resolves to a private IP', async () => {
          setUrl('https://public-host.com/download.pdf')
          const redirectResponse = {
            ok: true,
            status: 302,
            headers: new Map<string, string>([['location', 'https://resolved-private.com/file.pdf']]),
          }
          const fetchMock = vi.fn().mockResolvedValue(redirectResponse)
          vi.stubGlobal('fetch', fetchMock)

          // Override DNS to resolve resolved-private.com to a private IP while keeping public-host.com public.
          const dnsModule = await import('node:dns/promises')
          ;(vi.mocked(dnsModule.default.lookup) as ReturnType<typeof vi.fn>).mockImplementation(async (hostname: string) => {
            if (hostname === 'resolved-private.com') {
              return [{ address: '10.10.10.10', family: 4 }]
            }
            return [{ address: '1.1.1.1', family: 4 }]
          })

          await runEvent()

          expect(fetchMock).toHaveBeenCalledTimes(1)
          expect(ctx.reply).toHaveBeenCalledWith('download_error')
          expect(mockBrowser.getInstance).not.toHaveBeenCalled()
        })
      })

      describe('validation errors', () => {
        it('should reply with error if session is invalid', async () => {
          ctx.session.params = null

          await runEvent()

          expect(ctx.reply).toHaveBeenCalledWith('download_error')
        })

        it.each([
          ['invalid protocol', 'file:///etc/passwd'],
          ['malformed URL', 'http://'],
        ])('should reply with error for %s', async (_, url) => {
          setUrl(url)

          await runEvent()

          expect(ctx.reply).toHaveBeenCalledWith('download_error')
        })
      })

      describe('browser-based download', () => {
        it('should work with http protocol', async () => {
          setUrl('http://example.com')
          await runEvent()

          expect(ctx.replyWithDocument).toHaveBeenCalled()
        })

        it('should handle errors during conversion', async () => {
          const error = new Error('Navigation failed')
          const mockPage = await (await mockBrowser.getInstance()).newPage()
          vi.spyOn(mockPage, 'goto').mockRejectedValue(error)
          // @ts-expect-error logger is protected
          vi.spyOn(handler.logger, 'error')

          await runEvent()

          // @ts-expect-error logger is protected
          expect(handler.logger.error).toHaveBeenCalledWith(error)
          expect(ctx.reply).toHaveBeenCalledWith('download_error')
          expect(mockPage.close).toHaveBeenCalled()
          expect(mockUserRepository.decrementUsage).toHaveBeenCalledWith(123)
        })

        it('should handle page.close error', async () => {
          const mockPage = await (await mockBrowser.getInstance()).newPage()
          vi.spyOn(mockPage, 'close').mockRejectedValue(new Error('Close failed'))
          // @ts-expect-error logger is protected
          vi.spyOn(handler.logger, 'error')
          await runEvent()
          // @ts-expect-error logger is protected
          expect(handler.logger.error).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.any(Error) }),
            'Failed to close page.',
          )
        })

        it('should fallback to document if title is fully sanitized away', async () => {
          const mockPage = await (await mockBrowser.getInstance()).newPage()
          vi.spyOn(mockPage, 'title').mockResolvedValue('*?()')
          await runEvent()
          expect(ctx.replyWithDocument).toHaveBeenCalledWith(
            expect.objectContaining({ filename: 'document.pdf' }),
          )
        })

        it('should fail on generic dns resolution errors', async () => {
          setUrl('http://unknown-host.com')
          const dns = await import('node:dns/promises')
          ;(vi.mocked(dns.default.lookup) as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOTFOUND'))
          await runEvent()
          expect(ctx.reply).toHaveBeenCalledWith('download_error')
          expect(ctx.replyWithDocument).not.toHaveBeenCalled()
        })

        describe('ssrf protection', () => {
          it.each([
            ['private IP hostname', '127.0.0.1'],
            ['IPv6 private IP hostname', '[fc00::1]'],
            ['localhost IPv6 hostname', '[::1]'],
            ['IPv4 mapped IPv6 private addresses', '[::ffff:127.0.0.1]'],
            ['malformed IPv6 brackets gracefully (starting but not ending)', '[127.0.0.1'],
          ])('should block %s', async (_, host) => {
            setUrl(`http://${host}`)

            await runEvent()

            expect(ctx.reply).toHaveBeenCalledWith('download_error')
          })

          it.each([
            ['private IP', '10.0.0.1', 4],
            ['IPv6 private IP', 'fd00::1', 6],
          ])('should block URL that resolves to %s', async (_, ip, family) => {
            setUrl('http://private-host.com')
            const dns = await import('node:dns/promises')
            ;(vi.mocked(dns.default.lookup) as ReturnType<typeof vi.fn>).mockResolvedValue([{ address: ip, family }])

            await runEvent()

            expect(ctx.reply).toHaveBeenCalledWith('download_error')
          })

          it.each([
            ['Private IP rejection', '127.0.0.1'],
            ['linkLocal addresses', '169.254.1.1'],
            ['unspecified addresses', '0.0.0.0'],
          ])('should log error for %s', async (_, ip) => {
            setUrl(`http://${ip}`)
            // @ts-expect-error logger is protected
            vi.spyOn(handler.logger, 'error')
            await runEvent()
            // @ts-expect-error logger is protected
            expect(handler.logger.error).toHaveBeenCalledWith(new Error('Private IP addresses are not allowed'))
          })

          it('should block private/local IPs and allow public IPs during request interception', async () => {
            let requestHandler: ((req: HTTPRequest) => void | Promise<void>) | undefined
            const mockPage = await (await mockBrowser.getInstance()).newPage()
            vi.spyOn(mockPage, 'on').mockImplementation((event, callback) => {
              if (event === 'request') {
                requestHandler = callback as (req: HTTPRequest) => void | Promise<void>
              }
              return mockPage
            })

            await runEvent()

            expect(requestHandler).toBeDefined()
            if (requestHandler) {
              // Case 1: Private IP hostname
              const mockAbort = vi.fn().mockResolvedValue(undefined)
              const mockContinue = vi.fn().mockResolvedValue(undefined)
              const mockRequestPrivate = {
                url: () => 'http://127.0.0.1/logo.png',
                abort: mockAbort,
                continue: mockContinue,
              }
              requestHandler(mockRequestPrivate as unknown as HTTPRequest)
              expect(mockAbort).toHaveBeenCalledWith('aborted')
              expect(mockContinue).not.toHaveBeenCalled()

              // Case 2: Public IP hostname but resolves to private IP
              const mockAbortDns = vi.fn().mockResolvedValue(undefined)
              const mockContinueDns = vi.fn().mockResolvedValue(undefined)
              const mockRequestDns = {
                url: () => 'http://malicious-local.com/logo.png',
                abort: mockAbortDns,
                continue: mockContinueDns,
              }
              const dns = await import('node:dns/promises')
              // Mock dns lookup to return a private IP
              ;(vi.mocked(dns.default.lookup) as ReturnType<typeof vi.fn>).mockResolvedValue([{ address: '10.0.0.1', family: 4 }])

              requestHandler(mockRequestDns as unknown as HTTPRequest)
              // Wait for microtasks
              await new Promise(resolve => setTimeout(resolve, 10))

              expect(mockAbortDns).toHaveBeenCalledWith('aborted')
              expect(mockContinueDns).not.toHaveBeenCalled()

              // Case 3: Safe public IP
              const mockAbortSafe = vi.fn().mockResolvedValue(undefined)
              const mockContinueSafe = vi.fn().mockResolvedValue(undefined)
              const mockRequestSafe = {
                url: () => 'http://safe-public.com/logo.png',
                abort: mockAbortSafe,
                continue: mockContinueSafe,
              }
              // Mock dns lookup to return a public IP
              ;(vi.mocked(dns.default.lookup) as ReturnType<typeof vi.fn>).mockResolvedValue([{ address: '8.8.8.8', family: 4 }])

              requestHandler(mockRequestSafe as unknown as HTTPRequest)
              // Wait for microtasks
              await new Promise(resolve => setTimeout(resolve, 10))

              expect(mockAbortSafe).not.toHaveBeenCalled()
              expect(mockContinueSafe).toHaveBeenCalled()
            }
          })
        })
      })
    })
  })
})

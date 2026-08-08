import { InlineKeyboard } from 'grammy'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HelpMessage } from './help.message'

describe(HelpMessage.name, () => {
  const mockHandlers = [
    { command: 'help', description: 'Show the list of available commands' },
    { command: 'download', description: 'Download a PDF from a URL' },
  ] as any

  const ctx = { t: (key: string) => key } as any

  beforeEach(() => {
    ;(HelpMessage as any).cache = new WeakMap()
  })

  it('should build a help message with inline keyboard and one column', () => {
    const { text, reply_markup } = new HelpMessage(mockHandlers, ctx).build()
    expect(text).toBe('help_select_operation')
    expect(reply_markup).toBeInstanceOf(InlineKeyboard)

    const keyboard = reply_markup as InlineKeyboard
    const buttons = keyboard.inline_keyboard

    expect(buttons[0][0].text).toBe('operation_download')
    expect((buttons[0][0] as any).callback_data).toBe('download')
    expect(buttons[1][0].text).toBe('operation_help')
    expect((buttons[1][0] as any).callback_data).toBe('help')
  })

  it('should not include uncategorized handlers', () => {
    const customHandlers = [
      { command: 'custom', description: 'Custom command' },
    ] as any
    const { reply_markup } = new HelpMessage(customHandlers, ctx).build()
    const keyboard = reply_markup as InlineKeyboard
    const buttons = keyboard.inline_keyboard

    const flatButtons = buttons.flat()
    expect(flatButtons).toHaveLength(0)
  })

  it('should return an object with text and reply_markup', () => {
    const result = new HelpMessage(mockHandlers, ctx).build()
    expect(result).toBeTypeOf('object')
    expect(result).toHaveProperty('text')
    expect(result).toHaveProperty('reply_markup')
  })

  describe('caching', () => {
    it('should return the cached result for the same language and handlers', () => {
      const ctx1 = { session: { language: 'en' }, t: (key: string) => key } as any
      const ctx2 = { session: { language: 'en' }, t: (key: string) => key } as any

      const result1 = new HelpMessage(mockHandlers, ctx1).build()
      const result2 = new HelpMessage(mockHandlers, ctx2).build()

      expect(result1).toBe(result2)
    })

    it('should return different results for different languages', () => {
      const ctxEn = { session: { language: 'en' }, t: (key: string) => `${key}_en` } as any
      const ctxPt = { session: { language: 'pt' }, t: (key: string) => `${key}_pt` } as any

      const resultEn = new HelpMessage(mockHandlers, ctxEn).build()
      const resultPt = new HelpMessage(mockHandlers, ctxPt).build()

      expect(resultEn).not.toBe(resultPt)
      expect(resultEn.text).toBe('help_select_operation_en')
      expect(resultPt.text).toBe('help_select_operation_pt')
    })

    it('should return different cache entries for different handler arrays', () => {
      const otherHandlers = [
        { command: 'download', description: 'Download a PDF from a URL' },
      ] as any
      const ctxEn = { session: { language: 'en' }, t: (key: string) => key } as any

      const result1 = new HelpMessage(mockHandlers, ctxEn).build()
      const result2 = new HelpMessage(otherHandlers, ctxEn).build()

      expect(result1).not.toBe(result2)
    })

    it('should fallback to en when session language is undefined', () => {
      const ctxNoLang = { session: { language: undefined }, t: (key: string) => key } as any
      const ctxEn = { session: { language: 'en' }, t: (key: string) => key } as any

      const result1 = new HelpMessage(mockHandlers, ctxNoLang).build()
      const result2 = new HelpMessage(mockHandlers, ctxEn).build()

      expect(result1).toBe(result2)
    })

    it('should not call ctx.t again when returning cached result', () => {
      const t = vi.fn((key: string) => key)
      const ctx1 = { session: { language: 'en' }, t } as any

      new HelpMessage(mockHandlers, ctx1).build()
      const callCountAfterFirst = t.mock.calls.length

      new HelpMessage(mockHandlers, ctx1).build()

      expect(t.mock.calls.length).toBe(callCountAfterFirst)
    })
  })
})

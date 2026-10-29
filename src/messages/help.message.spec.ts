import type { BaseHandler } from '../handlers/base.handler'
import type { SessionData } from '../interfaces/session-data.interface'
import type { CustomContext } from '../types/custom-context.type'

import { InlineKeyboard } from 'grammy'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { LanguageEnum } from '../enums/language.enum'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { HelpMessage } from './help.message'

function createMockCtx(overrides: Omit<Partial<CustomContext>, 'session'> & { session?: Partial<SessionData> } = {}): CustomContext {
  return {
    session: { command: null, params: null, ...overrides.session },
    user: overrides.user ?? null,
    t: overrides.t ?? ((key: string) => key),
    ...Object.fromEntries(Object.entries(overrides).filter(([k]) => k !== 'session')),
  } as unknown as CustomContext
}

describe(HelpMessage.name, () => {
  const mockHandlers: BaseHandler[] = [
    { command: CommandEnum.Help, description: '' } as unknown as BaseHandler,
    { command: CommandEnum.Download, description: '' } as unknown as BaseHandler,
  ]

  beforeEach(() => {
    // @ts-expect-error cache is private
    ;(HelpMessage.cache = new WeakMap())
  })

  it('should build a help message with inline keyboard and one column', () => {
    const { text, reply_markup } = new HelpMessage(mockHandlers, createMockCtx()).build()
    expect(text).toBe('help_select_operation')
    expect(reply_markup).toBeInstanceOf(InlineKeyboard)

    const keyboard = reply_markup as InlineKeyboard
    const buttons = keyboard.inline_keyboard

    expect(buttons[0][0].text).toBe('operation_download')
    expect((buttons[0][0] as { callback_data: string }).callback_data).toBe('download')
    expect(buttons[1][0].text).toBe('operation_help')
    expect((buttons[1][0] as { callback_data: string }).callback_data).toBe('help')
  })

  it('should include extract, extracttext and rotate as operations', () => {
    const operationHandlers: BaseHandler[] = [
      { command: 'extract' } as unknown as BaseHandler,
      { command: 'extracttext' } as unknown as BaseHandler,
      { command: 'rotate' } as unknown as BaseHandler,
    ]
    const { reply_markup } = new HelpMessage(operationHandlers, createMockCtx()).build()
    const keyboard = reply_markup as InlineKeyboard
    const buttons = keyboard.inline_keyboard

    expect(buttons[0][0].text).toBe('operation_extract')
    expect((buttons[0][0] as { callback_data: string }).callback_data).toBe('extract')
    expect(buttons[1][0].text).toBe('operation_extracttext')
    expect((buttons[1][0] as { callback_data: string }).callback_data).toBe('extracttext')
    expect(buttons[2][0].text).toBe('operation_rotate')
    expect((buttons[2][0] as { callback_data: string }).callback_data).toBe('rotate')
  })

  it('should not include uncategorized handlers', () => {
    const customHandlers: BaseHandler[] = [
      { command: 'custom' } as unknown as BaseHandler,
    ]
    const { reply_markup } = new HelpMessage(customHandlers, createMockCtx()).build()
    const keyboard = reply_markup as InlineKeyboard
    const buttons = keyboard.inline_keyboard

    const flatButtons = buttons.flat()
    expect(flatButtons).toHaveLength(0)
  })

  it('should return an object with text and reply_markup', () => {
    const result = new HelpMessage(mockHandlers, createMockCtx()).build()
    expect(result).toBeTypeOf('object')
    expect(result).toHaveProperty('text')
    expect(result).toHaveProperty('reply_markup')
  })

  describe('caching', () => {
    it('should return the cached result for the same language and handlers', () => {
      const ctx1 = createMockCtx({ session: { language: LanguageEnum.English } })
      const ctx2 = createMockCtx({ session: { language: LanguageEnum.English } })

      const result1 = new HelpMessage(mockHandlers, ctx1).build()
      const result2 = new HelpMessage(mockHandlers, ctx2).build()

      expect(result1).toBe(result2)
    })

    it('should return different results for different languages', () => {
      const ctxEn = createMockCtx({ session: { language: LanguageEnum.English }, t: (key: string) => `${key}_en` })
      const ctxPt = createMockCtx({ session: { language: LanguageEnum.Portuguese }, t: (key: string) => `${key}_pt` })

      const resultEn = new HelpMessage(mockHandlers, ctxEn).build()
      const resultPt = new HelpMessage(mockHandlers, ctxPt).build()

      expect(resultEn).not.toBe(resultPt)
      expect(resultEn.text).toBe('help_select_operation_en')
      expect(resultPt.text).toBe('help_select_operation_pt')
    })

    it('should return different cache entries for different handler arrays', () => {
      const otherHandlers: BaseHandler[] = [
        { command: CommandEnum.Download, description: '' } as unknown as BaseHandler,
      ]
      const ctxEn = createMockCtx({ session: { language: LanguageEnum.English } })

      const result1 = new HelpMessage(mockHandlers, ctxEn).build()
      const result2 = new HelpMessage(otherHandlers, ctxEn).build()

      expect(result1).not.toBe(result2)
    })

    it('should fallback to en when session language is undefined', () => {
      const ctxNoLang = createMockCtx({ session: { language: undefined } })
      const ctxEn = createMockCtx({ session: { language: LanguageEnum.English } })

      const result1 = new HelpMessage(mockHandlers, ctxNoLang).build()
      const result2 = new HelpMessage(mockHandlers, ctxEn).build()

      expect(result1).toBe(result2)
    })

    it('should not call ctx.t again when returning cached result', () => {
      const t = vi.fn((key: string) => key)
      const ctx1 = createMockCtx({ session: { language: LanguageEnum.English }, t })

      new HelpMessage(mockHandlers, ctx1).build()
      const callCountAfterFirst = t.mock.calls.length

      new HelpMessage(mockHandlers, ctx1).build()

      expect(t.mock.calls.length).toBe(callCountAfterFirst)
    })

    it('should use operation_subscription for pro users and operation_pro for free users', () => {
      const proHandlers: BaseHandler[] = [
        { command: CommandEnum.Pro, description: '' } as unknown as BaseHandler,
      ]

      const freeCtx = createMockCtx({
        session: { language: LanguageEnum.English },
        user: { plan_type: PlanTypeEnum.Free } as NonNullable<CustomContext['user']>,
      })
      const proCtx = createMockCtx({
        session: { language: LanguageEnum.English },
        user: { plan_type: PlanTypeEnum.Pro } as NonNullable<CustomContext['user']>,
      })

      const freeResult = new HelpMessage(proHandlers, freeCtx).build()
      const proResult = new HelpMessage(proHandlers, proCtx).build()

      const freeKeyboard = freeResult.reply_markup as InlineKeyboard
      const proKeyboard = proResult.reply_markup as InlineKeyboard

      expect(freeKeyboard.inline_keyboard[0][0].text).toBe('operation_pro')
      expect(proKeyboard.inline_keyboard[0][0].text).toBe('operation_subscription')
    })
  })
})

import { InlineKeyboard } from 'grammy'
import { describe, expect, it } from 'vitest'
import { HelpMessage } from './help.message'

describe(HelpMessage.name, () => {
  const mockHandlers = [
    { command: 'help', description: 'Show the list of available commands' },
    { command: 'download', description: 'Download a PDF from a URL' },
  ] as any

  const ctx = { t: (key: string) => key } as any

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
})

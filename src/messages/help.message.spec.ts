import { InlineKeyboard } from 'grammy'
import { describe, expect, it } from 'vitest'
import { HelpMessage } from './help.message'

describe(HelpMessage.name, () => {
  const mockHandlers = [
    { command: 'help', description: 'Show the list of available commands' },
    { command: 'download', description: 'Download a PDF from a URL' },
  ] as any

  it('should build a help message with inline keyboard and two columns', () => {
    const { text, reply_markup } = new HelpMessage(mockHandlers).build()
    expect(text).toBe('Please select an operation:')
    expect(reply_markup).toBeInstanceOf(InlineKeyboard)

    const keyboard = reply_markup as InlineKeyboard
    const buttons = keyboard.inline_keyboard

    // Row 1
    expect(buttons[0][0].text).toBe('Download a PDF from a URL')
    expect((buttons[0][0] as any).callback_data).toBe('download')
    expect(buttons[0][1].text).toBe('Show the list of available commands')
    expect((buttons[0][1] as any).callback_data).toBe('help')
  })

  it('should return an object with text and reply_markup', () => {
    const result = new HelpMessage(mockHandlers).build()
    expect(result).toBeTypeOf('object')
    expect(result).toHaveProperty('text')
    expect(result).toHaveProperty('reply_markup')
  })
})

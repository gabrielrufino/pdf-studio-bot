import { describe, expect, it } from 'vitest'
import { HelpMessage } from './help.message'

describe(HelpMessage.name, () => {
  const mockHandlers = [
    { command: 'help', description: 'Show the list of available commands' },
    { command: 'download', description: 'Download a PDF from a URL' },
  ] as any

  it('should build a help message from handlers', () => {
    const result = new HelpMessage(mockHandlers).build()
    expect(result).toContain('/help - Show the list of available commands')
    expect(result).toContain('/download - Download a PDF from a URL')
  })

  it('should return a string', () => {
    expect(new HelpMessage(mockHandlers).build()).toBeTypeOf('string')
  })
})

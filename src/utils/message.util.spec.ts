import { describe, expect, it } from 'vitest'
import { splitMessage } from './message.util'

describe('splitMessage', () => {
  it('should split a line that is longer than maxLength', () => {
    const longLine = 'B'.repeat(4500)
    const chunks = splitMessage(longLine, 4000)

    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toBe('B'.repeat(4000))
    expect(chunks[1]).toBe('B'.repeat(500))
  })

  it('should handle very long lines with multiple splits', () => {
    const veryLongLine = 'C'.repeat(10000)
    const chunks = splitMessage(veryLongLine, 4000)

    expect(chunks).toHaveLength(3)
    expect(chunks[0]).toBe('C'.repeat(4000))
    expect(chunks[1]).toBe('C'.repeat(4000))
    expect(chunks[2]).toBe('C'.repeat(2000))
  })

  it('should push currentChunk if a long line is encountered', () => {
    const text = `short line\n${'B'.repeat(4500)}`
    const chunks = splitMessage(text, 4000)

    expect(chunks).toHaveLength(3)
    expect(chunks[0]).toBe('short line')
    expect(chunks[1]).toBe('B'.repeat(4000))
    expect(chunks[2]).toBe('B'.repeat(500))
  })

  it('should start a new chunk if adding a line exceeds maxLength', () => {
    const text = `${'A'.repeat(3000)}\n${'B'.repeat(1500)}`
    const chunks = splitMessage(text, 4000)

    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toBe('A'.repeat(3000))
    expect(chunks[1]).toBe('B'.repeat(1500))
  })
})

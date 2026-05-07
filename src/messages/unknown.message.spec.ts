import { describe, expect, it } from 'vitest'
import { UnknownMessage } from './unknown.message'

describe(UnknownMessage.name, () => {
  it('should return a "not understood" message', () => {
    const result = new UnknownMessage().build()
    expect(result).toBe("⚠️ I'm sorry, I didn't understand that. Please check the available commands below:")
  })

  it('should return a string', () => {
    expect(new UnknownMessage().build()).toBeTypeOf('string')
  })
})

import { describe, expect, it } from 'vitest'
import { HelpMessage } from './help.message'

describe(HelpMessage.name, () => {
  it('should return a help message', () => {
    expect(
      new HelpMessage()
        .build()
    ).toBeInstanceOf(String)
  })
})

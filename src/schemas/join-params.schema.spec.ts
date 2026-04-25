import { describe, expect, it } from 'vitest'
import { JoinParamsSchema } from './join-params.schema'

describe('joinParamsSchema', () => {
  it('should default paths to an empty array', () => {
    const parsed = JoinParamsSchema.parse({})
    expect(parsed.paths).toEqual([])
  })
})

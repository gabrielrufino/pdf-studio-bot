import { describe, expect, it } from 'vitest'
import { JoinParamsSchema } from './join-params.schema'

describe('joinParamsSchema', () => {
  it('should have empty paths by default', () => {
    const result = JoinParamsSchema.parse({})
    expect(result.paths).toEqual([])
  })

  it('should accept an array of strings', () => {
    const result = JoinParamsSchema.parse({ paths: ['file1.pdf', 'file2.pdf'] })
    expect(result.paths).toEqual(['file1.pdf', 'file2.pdf'])
  })
})

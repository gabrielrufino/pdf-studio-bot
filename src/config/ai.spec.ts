import { describe, expect, it, vi } from 'vitest'

describe('ai config', () => {
  it('should throw if GOOGLE_GENAI_API_KEY is not set', async () => {
    vi.stubEnv('GOOGLE_GENAI_API_KEY', '')
    try {
      await expect(import(`./ai?throw=${Date.now()}`)).rejects.toThrow('GOOGLE_GENAI_API_KEY is not set')
    }
    finally {
      vi.unstubAllEnvs()
    }
  })

  it('should initialize GoogleGenAI if apiKey is set', async () => {
    vi.stubEnv('GOOGLE_GENAI_API_KEY', 'test-key')
    try {
      const { ai } = await import(`./ai?ok=${Date.now()}`)
      expect(ai).toBeDefined()
    }
    finally {
      vi.unstubAllEnvs()
    }
  })
})

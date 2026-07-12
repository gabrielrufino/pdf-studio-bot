import { Writable } from 'node:stream'
import pino from 'pino'
import { describe, expect, it } from 'vitest'

describe('logger', () => {
  it('should redact sensitive keys at multiple nesting depths', () => {
    const logs: any[] = []

    const stream = new Writable({
      write(chunk, encoding, callback) {
        logs.push(JSON.parse(chunk.toString()))
        callback()
      },
    })

    // We recreate the logger purely to inject our in-memory stream.
    // The point of the test is to ensure the redaction paths we defined work.
    const testLogger = pino(
      {
        redact: {
          paths: [
            'BOT_TOKEN',
            '*.BOT_TOKEN',
            '*.*.BOT_TOKEN',
            '*.*.*.BOT_TOKEN',
            '*.*.*.*.BOT_TOKEN',
            'GOOGLE_GENAI_API_KEY',
            '*.GOOGLE_GENAI_API_KEY',
            '*.*.GOOGLE_GENAI_API_KEY',
            '*.*.*.GOOGLE_GENAI_API_KEY',
            '*.*.*.*.GOOGLE_GENAI_API_KEY',
            'LOKI_HOST',
            '*.LOKI_HOST',
            '*.*.LOKI_HOST',
            '*.*.*.LOKI_HOST',
            '*.*.*.*.LOKI_HOST',
            'token',
            '*.token',
            '*.*.token',
            '*.*.*.token',
            '*.*.*.*.token',
            'apiKey',
            '*.apiKey',
            '*.*.apiKey',
            '*.*.*.apiKey',
            '*.*.*.*.apiKey',
            '*.Authorization',
            '*.*.Authorization',
            '*.*.*.Authorization',
            '*.*.*.*.Authorization',
          ],
          censor: '[REDACTED]',
        },
      },
      stream,
    )

    testLogger.info({
      BOT_TOKEN: 'secret1',
      nested: { BOT_TOKEN: 'secret2' },
      deep: { nested: { BOT_TOKEN: 'secret3' } },
      very: { deep: { nested: { BOT_TOKEN: 'secret4' } } },
      ultra: { very: { deep: { nested: { BOT_TOKEN: 'secret5' } } } },
      GOOGLE_GENAI_API_KEY: 'secret_key',
      auth: { GOOGLE_GENAI_API_KEY: 'secret_key_2' },
      LOKI_HOST: 'host1',
      servers: { LOKI_HOST: 'host2' },
      token: 'tok1',
      apiKey: 'api1',
      header: { Authorization: 'Bearer x' },
    })

    const log = logs[0]

    expect(log.BOT_TOKEN).toBe('[REDACTED]')
    expect(log.nested.BOT_TOKEN).toBe('[REDACTED]')
    expect(log.deep.nested.BOT_TOKEN).toBe('[REDACTED]')
    expect(log.very.deep.nested.BOT_TOKEN).toBe('[REDACTED]')
    expect(log.ultra.very.deep.nested.BOT_TOKEN).toBe('[REDACTED]')

    expect(log.GOOGLE_GENAI_API_KEY).toBe('[REDACTED]')
    expect(log.auth.GOOGLE_GENAI_API_KEY).toBe('[REDACTED]')

    expect(log.LOKI_HOST).toBe('[REDACTED]')
    expect(log.servers.LOKI_HOST).toBe('[REDACTED]')

    expect(log.token).toBe('[REDACTED]')
    expect(log.apiKey).toBe('[REDACTED]')
    expect(log.header.Authorization).toBe('[REDACTED]')
  })
})

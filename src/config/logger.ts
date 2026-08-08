import process from 'node:process'
import pino from 'pino'

export const SENSITIVE_KEYS = new Set([
  'BOT_TOKEN',
  'GOOGLE_GENAI_API_KEY',
  'token',
  'apiKey',
  'Authorization',
])

const CENSOR = '[REDACTED]'

/**
 * Recursively redacts sensitive keys from a log object at any depth.
 * Unlike Pino's built-in `redact` (which relies on `fast-redact` and
 * does not support recursive wildcards), this handles arbitrarily nested objects.
 */
export function deepRedact(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const key of Object.keys(obj)) {
    if (SENSITIVE_KEYS.has(key)) {
      result[key] = CENSOR
    }
    else if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      result[key] = deepRedact(obj[key] as Record<string, unknown>)
    }
    else {
      result[key] = obj[key]
    }
  }

  return result
}

const transport
  = process.env.NODE_ENV !== 'production'
    ? pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    })
    : undefined

export const logger = pino(
  {
    formatters: {
      log: deepRedact,
    },
  },
  transport,
)

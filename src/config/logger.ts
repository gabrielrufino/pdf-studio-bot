import process from 'node:process'
import pino from 'pino'

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
  transport,
)

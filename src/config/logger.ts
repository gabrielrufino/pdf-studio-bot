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
        'GOOGLE_GENAI_API_KEY',
        'process.env.BOT_TOKEN',
        'process.env.GOOGLE_GENAI_API_KEY',
        'token',
        'apiKey',
        '*.token',
        '*.apiKey',
        '*.Authorization',
      ],
      censor: '[REDACTED]',
    },
  },
  transport,
)

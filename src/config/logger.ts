import process from 'node:process'
import pino from 'pino'

const transport = pino.transport({
  targets: [
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        }
      : {
          target: 'pino-loki',
          options: {
            host: process.env.LOKI_HOST,
            labels: {
              application: 'pdf-studio-bot',
            },
          },
        },
  ],
})

export const logger = pino(transport)

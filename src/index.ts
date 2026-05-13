import process from 'node:process'
import { run } from '@grammyjs/runner'

import { initApp } from './app'
import { bot } from './config/bot'
import { browser } from './config/browser'
import { mongoClient } from './config/database'
import { logger } from './config/logger'

async function main() {
  await initApp()

  const runner = run(bot)

  const stop = async () => {
    logger.info('Shutting down gracefully...')
    try {
      await runner.stop()
      await Promise.allSettled([
        mongoClient.close(),
        browser.close(),
      ])
    }
    catch (error) {
      logger.error({ error }, 'Error during graceful shutdown.')
    }
    finally {
      process.exit(0)
    }
  }

  process
    .once('SIGINT', stop)
    .once('SIGTERM', stop)

  logger.info('Bot is running...')
}

void main()

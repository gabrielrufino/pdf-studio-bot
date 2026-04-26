import type { FilterQuery } from 'grammy'
import type { CustomContext } from './types/custom-context.type'
import process from 'node:process'
import { run } from '@grammyjs/runner'

import { bot } from './config/bot'
import { browser } from './config/browser'
import { mongoClient } from './config/database'
import { logger } from './config/logger'
import { InvalidFileError } from './errors/invalid-file.error'
import { SessionValidationError } from './errors/session-validation.error'
import { handlers } from './handlers'
import { usageLimitMiddleware } from './middlewares/usage-limit.middleware'
import { repositories } from './repositories'

async function main() {
  await Promise.all(
    repositories.map(repo => repo.init()),
  )

  for (const handler of handlers) {
    bot.command(
      handler.command,
      usageLimitMiddleware(handler),
      handler.onCommand.bind(handler),
    )
  }

  const events = new Set(handlers.flatMap(handler => Object.keys(handler.events) as FilterQuery[]))
  for (const event of events) {
    bot.on(event, async (ctx) => {
      const userId = ctx.from?.id || ctx.chat?.id
      if (!userId) {
        return
      }

      const command = ctx.session.command
      const handler = handlers.find(h => h.command === command)
      const eventHandler = handler?.events[event]

      if (!handler || !eventHandler) {
        return
      }

      try {
        const runWithLimit = usageLimitMiddleware(handler)
        await runWithLimit(ctx, () => eventHandler(ctx))
      }
      catch (error) {
        await handleHandlerError(ctx, error)
      }
    })
  }

  const runner = run(bot)

  await bot.api.setMyCommands(
    handlers.map(h => ({ command: h.command, description: h.description })),
  )

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

async function handleHandlerError(ctx: CustomContext, error: unknown) {
  if (error instanceof SessionValidationError) {
    await ctx.reply(`⚠️ ${error.message}`)
    ctx.session.command = null
    ctx.session.params = null
    return
  }

  if (error instanceof InvalidFileError) {
    return
  }

  throw error
}

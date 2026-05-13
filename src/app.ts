import type { FilterQuery } from 'grammy'
import type { CustomContext } from './types/custom-context.type'
import { bot } from './config/bot'
import { CommandEnum } from './enums/command.enum'
import { InvalidFileError } from './errors/invalid-file.error'
import { SessionValidationError } from './errors/session-validation.error'
import { handlers } from './handlers'
import { HelpMessage } from './messages/help.message'
import { UnknownMessage } from './messages/unknown.message'
import { usageLimitMiddleware } from './middlewares/usage-limit.middleware'
import { repositories } from './repositories'

export async function initApp() {
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
    bot.on(event, async (ctx, next) => {
      const userId = ctx.from?.id || ctx.chat?.id
      if (!userId) {
        return
      }

      let command = ctx.session.command
      if (event === 'callback_query' && (!command || handlers.some(h => h.command === ctx.callbackQuery?.data))) {
        command = CommandEnum.Help
      }

      const handler = handlers.find(h => h.command === command)
      const eventHandler = handler?.events[event]

      if (!handler || !eventHandler) {
        return next()
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

  await bot.api.setMyCommands(
    handlers.map(h => ({ command: h.command, description: h.description })),
  )

  bot.on('message', async (ctx) => {
    const { text, reply_markup } = new HelpMessage(handlers).build()
    await ctx.reply(
      `${new UnknownMessage().build()}\n\n${text}`,
      { reply_markup },
    )
  })

  bot.on('callback_query', ctx => ctx.answerCallbackQuery())
}

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

import type { NextFunction } from 'grammy'
import type { CustomContext } from '../types/custom-context.type'
import { configurationRepository } from '../repositories'

export async function maintenanceMiddleware(ctx: CustomContext, next: NextFunction) {
  const config = await configurationRepository.findGlobalConfig()

  if (!config?.maintenance_mode) {
    return next()
  }

  const hasOngoingCommand = !!ctx.session.command
  const isNewInteraction = ctx.message?.text?.startsWith('/') || (!hasOngoingCommand && ctx.callbackQuery)

  if (!hasOngoingCommand || isNewInteraction) {
    await ctx.reply(ctx.t('maintenance_mode_active'))
    return
  }

  if (ctx.session.command_started_at) {
    const elapsedMinutes = (Date.now() - ctx.session.command_started_at) / (1000 * 60)
    const timeout = config.maintenance_timeout_minutes ?? 30

    if (elapsedMinutes > timeout) {
      ctx.session.command = null
      ctx.session.params = null
      ctx.session.command_started_at = undefined

      await ctx.reply(ctx.t('maintenance_timeout'))
      return
    }
  }

  return next()
}

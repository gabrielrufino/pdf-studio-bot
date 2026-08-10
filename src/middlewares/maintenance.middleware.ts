import type { NextFunction } from 'grammy'
import type { ConfigurationEntity } from '../entities/configuration.entity'
import type { CustomContext } from '../types/custom-context.type'
import { configurationRepository } from '../repositories'

const CACHE_TTL_MS = 30_000

let cachedConfig: { value: ConfigurationEntity | null, expiresAt: number } | null = null

export function clearMaintenanceCache() {
  cachedConfig = null
}

export async function maintenanceMiddleware(ctx: CustomContext, next: NextFunction) {
  if (!cachedConfig || Date.now() > cachedConfig.expiresAt) {
    cachedConfig = {
      value: await configurationRepository.findGlobalConfig(),
      expiresAt: Date.now() + CACHE_TTL_MS,
    }
  }

  if (!cachedConfig.value?.maintenance_mode) {
    return next()
  }

  await ctx.reply(ctx.t('maintenance_mode_active'))
}

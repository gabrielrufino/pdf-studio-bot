import type { NextFunction } from 'grammy'
import type { BaseHandler } from '../handlers/base.handler'
import type { CustomContext } from '../types/custom-context.type'
import { UserEntity } from '../entities/user.entity'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { userRepository } from '../repositories'

export function usageLimitMiddleware(handler: BaseHandler) {
  return async (ctx: CustomContext, next: NextFunction) => {
    if (!handler.hasUsageLimits) {
      return next()
    }

    let user = await userRepository.findByTelegramId(ctx.from!.id)
    if (!user) {
      user = await userRepository.create(new UserEntity({
        telegram_user: ctx.from!,
      }))
    }

    const limits = {
      [PlanTypeEnum.Free]: 3,
      [PlanTypeEnum.Pro]: 50,
    }

    const limit = limits[user.plan_type || PlanTypeEnum.Free]

    const today = new Date().toISOString().split('T')[0]
    if (user.last_usage_date !== today) {
      user.daily_usage_count = 0
      user.last_usage_date = today
    }

    if (user.daily_usage_count >= limit) {
      if (user.plan_type === PlanTypeEnum.Pro) {
        await ctx.reply('⚠️ You have reached your daily limit of 50 operations. As a PRO user, this is our safety limit. Please try again tomorrow.')
      }
      else {
        await ctx.reply('⚠️ You have reached your daily limit of 3 operations. Upgrade to PRO for unlimited access (up to 50 ops/day)! /pro')
      }
      return
    }

    user.daily_usage_count++
    await userRepository.updateById(user._id, user)

    return next()
  }
}

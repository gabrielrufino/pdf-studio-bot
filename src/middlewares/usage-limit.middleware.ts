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

    const userId = ctx.from?.id
    if (!userId) {
      return next()
    }

    let user = await userRepository.findByTelegramId(userId)
    if (!user) {
      user = await userRepository.create(new UserEntity({
        telegram_user: ctx.from!,
      }))
    }
    else if (user.plan_type === PlanTypeEnum.Pro && user.plan_started_at) {
      const oneMonthAgo = new Date()
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30) // 30 days expiration

      if (user.plan_started_at < oneMonthAgo) {
        await userRepository.updateById(user._id, { plan_type: PlanTypeEnum.Free, plan_started_at: null })
        user.plan_type = PlanTypeEnum.Free
      }
    }
    else if (user.plan_type === PlanTypeEnum.ProTrial && user.plan_started_at) {
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3) // 3 days expiration

      if (user.plan_started_at < threeDaysAgo) {
        await userRepository.updateById(user._id, { plan_type: PlanTypeEnum.Free, plan_started_at: null })
        user.plan_type = PlanTypeEnum.Free
      }
    }

    const limits = {
      [PlanTypeEnum.Free]: 3,
      [PlanTypeEnum.Pro]: 50,
      [PlanTypeEnum.ProTrial]: 50,
    }

    const limit = limits[user.plan_type || PlanTypeEnum.Free]

    const isWithinLimit = await userRepository.isWithinLimit(ctx.from!.id, limit)

    if (!isWithinLimit) {
      if (user.plan_type === PlanTypeEnum.Pro || user.plan_type === PlanTypeEnum.ProTrial) {
        await ctx.reply(ctx.t('pro_limit_reached'))
      }
      else {
        await ctx.reply(ctx.t('free_limit_reached'))
      }
      return
    }

    return next()
  }
}

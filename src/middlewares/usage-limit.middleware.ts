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
        await userRepository.updateById(user._id, { plan_type: PlanTypeEnum.Free })
        user.plan_type = PlanTypeEnum.Free
      }
    }

    const limits = {
      [PlanTypeEnum.Free]: 3,
      [PlanTypeEnum.Pro]: 50,
    }

    const limit = limits[user.plan_type || PlanTypeEnum.Free]

    const updatedUser = await userRepository.incrementUsage(ctx.from!.id, limit)

    if (!updatedUser) {
      if (user.plan_type === PlanTypeEnum.Pro) {
        await ctx.reply('⚠️ You have reached your daily limit of 50 operations. As a PRO user, this is our safety limit. Please try again tomorrow.')
      }
      else {
        await ctx.reply('⚠️ You have reached your daily limit of 3 operations. Upgrade to PRO for unlimited access (up to 50 ops/day)! /pro')
      }
      return
    }

    return next()
  }
}

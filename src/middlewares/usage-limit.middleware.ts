import type { NextFunction } from 'grammy'
import type { BaseHandler } from '../handlers/base.handler'
import type { CustomContext } from '../types/custom-context.type'
import { UserEntity } from '../entities/user.entity'
import { LanguageEnum } from '../enums/language.enum'
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

    let user = ctx.user
    if (user === undefined) {
      user = await userRepository.findByTelegramId(userId)
    }

    if (!user) {
      user = await userRepository.create(new UserEntity({
        telegram_user: ctx.from!,
        language: ctx.session?.language || LanguageEnum.English,
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

    ctx.user = user

    return next()
  }
}

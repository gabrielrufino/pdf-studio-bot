import type { PaymentRepository } from '../repositories/payment.repository'
import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import process from 'node:process'
import { PaymentEntity } from '../entities/payment.entity'
import { CommandEnum } from '../enums/command.enum'
import { CurrencyEnum } from '../enums/currency.enum'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { BaseHandler } from './base.handler'

export class ProHandler extends BaseHandler {
  private static readonly STARS_AMOUNT_PROD = 350
  private static readonly STARS_AMOUNT_DEV = 1

  constructor(
    private readonly userRepository: UserRepository,
    private readonly paymentRepository: PaymentRepository,
  ) {
    super()
  }

  public readonly command = CommandEnum.Pro
  public readonly description = '💎 Get PRO access'
  public readonly hasUsageLimits = false
  public readonly events = {
    'pre_checkout_query': async (ctx: CustomContext) => {
      await ctx.answerPreCheckoutQuery(true)
    },
    'message:successful_payment': async (ctx: CustomContext) => {
      const userId = ctx.from?.id
      if (!userId) {
        return
      }

      const user = await this.userRepository.findByTelegramId(userId)
      if (user) {
        await Promise.all([
          this.userRepository.updateById(user._id, {
            plan_type: PlanTypeEnum.Pro,
            plan_started_at: new Date(),
          }),
          this.paymentRepository.create(new PaymentEntity({
            user_id: user._id,
            amount: ctx.message?.successful_payment?.total_amount,
            currency: ctx.message?.successful_payment?.currency as any,
          })),
        ])

        await ctx.reply('🎉 Thank you for subscribing to PRO! You now have full access to all features.')
      }

      await this.resetSession(ctx)
    },
  }

  async onCommand(ctx: CustomContext) {
    const userId = ctx.from?.id
    if (!userId) {
      return
    }

    const user = await this.userRepository.findByTelegramId(userId)

    if (user?.plan_type === PlanTypeEnum.Pro) {
      await ctx.reply('You are already a PRO user! Enjoy all the benefits! 💎')
      await this.resetSession(ctx)
      return
    }

    await this.setSessionCommand(ctx)

    const amount = process.env.NODE_ENV === 'production'
      ? ProHandler.STARS_AMOUNT_PROD
      : ProHandler.STARS_AMOUNT_DEV

    await ctx.replyWithInvoice(
      'PDF Studio PRO',
      'Get unlimited access to all features and higher limits!',
      'pdf-studio-pro-subscription',
      CurrencyEnum.XTR,
      [{ label: 'PRO Subscription', amount }],
      {
        provider_token: '',
      },
    )
  }
}

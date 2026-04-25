import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import process from 'node:process'
import { CommandEnum } from '../enums/command.enum'
import { CurrencyEnum } from '../enums/currency.enum'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { BaseHandler } from './base.handler'

export class ProHandler extends BaseHandler {
  constructor(
    private readonly userRepository: UserRepository,
  ) {
    super()
  }

  public readonly command = CommandEnum.Pro
  public readonly description = '💎 Get PRO access'
  public readonly events = {
    'pre_checkout_query': async (ctx: CustomContext) => {
      await ctx.answerPreCheckoutQuery(true)
    },
    'message:successful_payment': async (ctx: CustomContext) => {
      const user = await this.userRepository.findByTelegramId(ctx.from!.id)
      if (user) {
        user.plan_type = PlanTypeEnum.Pro
        await this.userRepository.updateById(user._id, user)
        await ctx.reply('🎉 Thank you for subscribing to PRO! You now have full access to all features.')
        await this.resetSession(ctx)
      }
    },
  }

  async onCommand(ctx: CustomContext) {
    const user = await this.userRepository.findByTelegramId(ctx.from!.id)

    if (user?.plan_type === PlanTypeEnum.Pro) {
      await ctx.reply('You are already a PRO user! Enjoy all the benefits! 💎')
      await this.resetSession(ctx)
      return
    }

    await this.setSessionCommand(ctx)

    const amount = process.env.NODE_ENV === 'production' ? 350 : 1

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

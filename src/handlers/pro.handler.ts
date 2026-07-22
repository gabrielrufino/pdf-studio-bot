import type { ConfigurationRepository } from '../repositories/configuration.repository'
import type { PaymentRepository } from '../repositories/payment.repository'
import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { InlineKeyboard } from 'grammy'
import { PaymentEntity } from '../entities/payment.entity'
import { CommandEnum } from '../enums/command.enum'
import { CurrencyEnum } from '../enums/currency.enum'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { BaseHandler } from './base.handler'

export class ProHandler extends BaseHandler {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly configurationRepository: ConfigurationRepository,
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
            amount: ctx.message!.successful_payment!.total_amount,
            currency: ctx.message!.successful_payment!.currency as CurrencyEnum,
          })),
        ])

        await ctx.reply(ctx.t('pro_success'))
      }

      await this.resetSession(ctx)
    },
    'callback_query': async (ctx: CustomContext) => {
      const data = ctx.callbackQuery?.data
      const userId = ctx.from?.id
      if (!userId || !data) {
        return
      }

      if (data === 'pro_start_trial') {
        const user = await this.userRepository.findByTelegramId(userId)
        if (user && !user.has_used_trial && user.plan_type !== PlanTypeEnum.Pro) {
          await this.userRepository.updateById(user._id, {
            plan_type: PlanTypeEnum.ProTrial,
            plan_started_at: new Date(),
            has_used_trial: true,
          })
          await ctx.answerCallbackQuery()
          await ctx.editMessageText(ctx.t('pro_trial_started'))
          await this.resetSession(ctx)
        }
      }
      else if (data === 'pro_send_invoice') {
        const { pro_price } = await this.configurationRepository.findGlobalConfig()
        await ctx.answerCallbackQuery()
        await ctx.replyWithInvoice(
          'PDF Studio PRO',
          ctx.t('pro_upgrade'),
          'pdf-studio-pro-subscription',
          CurrencyEnum.XTR,
          [{ label: 'PRO Subscription', amount: pro_price }],
          {
            provider_token: '',
          },
        )
      }
    },
  }

  async onCommand(ctx: CustomContext) {
    const userId = ctx.from?.id
    if (!userId) {
      return
    }

    const user = await this.userRepository.findByTelegramId(userId)

    if (user?.plan_type === PlanTypeEnum.Pro) {
      await ctx.reply(ctx.t('pro_already_pro'))
      await this.resetSession(ctx)
      return
    }

    if (user?.plan_type === PlanTypeEnum.ProTrial) {
      await ctx.reply(ctx.t('pro_trial_active'))
      await this.resetSession(ctx)
      return
    }

    await this.setSessionCommand(ctx)

    const keyboard = new InlineKeyboard()
    if (!user?.has_used_trial) {
      keyboard.text(ctx.t('pro_trial_button'), 'pro_start_trial').row()
    }
    keyboard.text(ctx.t('pro_buy_button'), 'pro_send_invoice')

    await ctx.reply(ctx.t('pro_upgrade'), {
      reply_markup: keyboard,
    })
  }
}

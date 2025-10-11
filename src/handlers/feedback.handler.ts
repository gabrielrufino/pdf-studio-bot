import type { CustomContext } from '../config/bot'
import type { FeedbackRepository } from '../repositories/feedback.repository'
import { FeedbackEntity } from '../entities/feedback.entity'
import { CommandEnum } from '../enums/command.enum'
import { BaseHandler } from './base.handler'

export class FeedbackHandler extends BaseHandler {
  constructor(
    private readonly feedbackRepository: FeedbackRepository,
  ) {
    super()
  }

  public readonly command = CommandEnum.Feedback
  public readonly events = {
    'msg:text': async (ctx: CustomContext) => {
      const feedback = ctx.message?.text

      await this.feedbackRepository.create(new FeedbackEntity({
        telegram_user: ctx.from!,
        text: feedback!,
        created_at: new Date(),
      }))

      await ctx.reply('Thank you for your feedback! We appreciate you taking the time to share your thoughts with us. If you have any more feedback or questions, feel free to reach out anytime.')

      this.clearSession(ctx)
    },
  }

  public async onCommand(ctx: CustomContext): Promise<void> {
    this.setSessionCommand(ctx)

    await ctx.reply('We value your feedback! Please reply to this message with your thoughts or suggestions about our service. Your input helps us improve and serve you better. Thank you!')
  }
}

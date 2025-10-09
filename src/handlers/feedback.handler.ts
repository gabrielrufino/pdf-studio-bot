import type { CustomContext } from '../config/bot'
import type { Handler } from '../interfaces/handler.interface'
import { FeedbackEntity } from '../entities/feedback.entity'
import { CommandEnum } from '../enums/command.enum'
import { FeedbackRepository } from '../repositories/feedback.repository'

export class FeedbackHandler implements Handler {
  public readonly command = CommandEnum.Feedback
  public readonly events = {
    'msg:text': async (ctx: CustomContext) => {
      const feedback = ctx.message?.text

      const feedbackRepository = new FeedbackRepository()

      await feedbackRepository.create(new FeedbackEntity({
        telegram_user: ctx.from!,
        text: feedback!,
        created_at: new Date(),
      }))

      await ctx.reply('Thank you for your feedback! We appreciate you taking the time to share your thoughts with us. If you have any more feedback or questions, feel free to reach out anytime.')
    },
  }

  public async onCommand(ctx: CustomContext): Promise<void> {
    ctx.session.command = CommandEnum.Feedback

    await ctx.reply('We value your feedback! Please reply to this message with your thoughts or suggestions about our service. Your input helps us improve and serve you better. Thank you!')
  }
}

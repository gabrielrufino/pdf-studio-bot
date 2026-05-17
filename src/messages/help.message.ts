import type { BaseHandler } from '../handlers/base.handler'
import type { CustomContext } from '../types/custom-context.type'
import { InlineKeyboard } from 'grammy'
import { CommandEnum } from '../enums/command.enum'

export class HelpMessage {
  private static readonly OPERATIONS = new Set<string>([
    CommandEnum.Download,
    CommandEnum.Join,
    CommandEnum.PdfToImages,
    CommandEnum.PutPassword,
    CommandEnum.Split,
    CommandEnum.Summary,
    CommandEnum.Language,
  ])

  private static readonly INFORMATION = new Set<string>([
    CommandEnum.Pro,
    CommandEnum.Feedback,
    CommandEnum.Version,
    CommandEnum.Help,
  ])

  constructor(
    private readonly handlers: BaseHandler[],
    private readonly ctx: CustomContext,
  ) {}

  public build() {
    const keyboard = new InlineKeyboard()

    const operationHandlers = this.handlers.filter(h => HelpMessage.OPERATIONS.has(h.command))
    const informationHandlers = this.handlers.filter(h => HelpMessage.INFORMATION.has(h.command))
    const otherHandlers = this.handlers.filter(
      h => !HelpMessage.OPERATIONS.has(h.command) && !HelpMessage.INFORMATION.has(h.command),
    )

    const allHandlers = [...operationHandlers, ...informationHandlers, ...otherHandlers]

    allHandlers.forEach((h) => {
      keyboard.text(this.ctx.t(`operation_${h.command}`), h.command).row()
    })

    return {
      text: this.ctx.t('help_select_operation'),
      reply_markup: keyboard,
    }
  }
}

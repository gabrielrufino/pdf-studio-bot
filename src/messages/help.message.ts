import type { BaseHandler } from '../handlers/base.handler'
import { InlineKeyboard } from 'grammy'
import { CommandEnum } from '../enums/command.enum'

export class HelpMessage {
  constructor(private readonly handlers: BaseHandler[]) {}

  public build() {
    const keyboard = new InlineKeyboard()

    const operations = new Set<string>([
      CommandEnum.Download,
      CommandEnum.Join,
      CommandEnum.PdfToImages,
      CommandEnum.PutPassword,
      CommandEnum.Split,
      CommandEnum.Summary,
    ])

    const information = new Set<string>([
      CommandEnum.Pro,
      CommandEnum.Feedback,
      CommandEnum.Version,
      CommandEnum.Help,
    ])

    const operationHandlers = this.handlers.filter(h => operations.has(h.command))
    const informationHandlers = this.handlers.filter(h => information.has(h.command))

    const allHandlers = [...operationHandlers, ...informationHandlers]

    allHandlers.forEach((h) => {
      keyboard.text(h.description, h.command).row()
    })

    return {
      text: 'Please select an operation:',
      reply_markup: keyboard,
    }
  }
}

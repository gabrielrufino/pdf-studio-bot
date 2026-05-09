import type { BaseHandler } from '../handlers/base.handler'
import { InlineKeyboard } from 'grammy'
import { CommandEnum } from '../enums/command.enum'

export class HelpMessage {
  constructor(private readonly handlers: BaseHandler[]) {}

  public build() {
    const keyboard = new InlineKeyboard()

    const operations = [
      CommandEnum.Download,
      CommandEnum.Join,
      CommandEnum.PdfToImages,
      CommandEnum.PutPassword,
      CommandEnum.Split,
      CommandEnum.Summary,
    ]

    const information = [
      CommandEnum.Pro,
      CommandEnum.Feedback,
      CommandEnum.Version,
      CommandEnum.Help,
    ]

    const operationHandlers = this.handlers.filter(h => operations.includes(h.command))
    const informationHandlers = this.handlers.filter(h => information.includes(h.command))

    const allHandlers = [...operationHandlers, ...informationHandlers]

    for (let i = 0; i < allHandlers.length; i += 2) {
      const h1 = allHandlers[i]
      const h2 = allHandlers[i + 1]

      keyboard.text(h1.description, h1.command)

      if (h2) {
        keyboard.text(h2.description, h2.command)
      }

      keyboard.row()
    }

    return {
      text: 'Please select an operation:',
      reply_markup: keyboard,
    }
  }
}

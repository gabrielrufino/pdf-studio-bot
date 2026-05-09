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

    operationHandlers.forEach((h) => {
      keyboard.text(h.description, h.command).row()
    })

    keyboard.text('---').row()

    informationHandlers.forEach((h) => {
      keyboard.text(h.description, h.command).row()
    })

    return {
      text: 'Please select an operation:',
      reply_markup: keyboard,
    }
  }
}

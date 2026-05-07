import { InlineKeyboard } from 'grammy'
import type { BaseHandler } from '../handlers/base.handler'

export class HelpMessage {
  constructor(private readonly handlers: BaseHandler[]) {}

  public build() {
    const keyboard = new InlineKeyboard()

    this.handlers.forEach((h, index) => {
      keyboard.text(h.description, h.command)
      if ((index + 1) % 2 === 0) {
        keyboard.row()
      }
    })

    return {
      text: 'Please select an operation:',
      reply_markup: keyboard,
    }
  }
}

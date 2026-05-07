import type { BaseHandler } from '../handlers/base.handler'
import { InlineKeyboard } from 'grammy'

export class HelpMessage {
  constructor(private readonly handlers: BaseHandler[]) {}

  public build() {
    const keyboard = new InlineKeyboard()

    this.handlers.forEach((h) => {
      keyboard.text(h.description, h.command).row()
    })

    return {
      text: 'Please select an operation:',
      reply_markup: keyboard,
    }
  }
}

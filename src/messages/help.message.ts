import type { BaseHandler } from '../handlers/base.handler'
import type { Message } from '../interfaces/message'

export class HelpMessage implements Message {
  constructor(private readonly handlers: BaseHandler[]) {}

  public build() {
    return this.handlers
      .map(h => `/${h.command} - ${h.description}`)
      .join('\n')
  }
}

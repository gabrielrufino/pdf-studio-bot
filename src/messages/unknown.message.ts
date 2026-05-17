import type { CustomContext } from '../types/custom-context.type'
import type { Message } from '../interfaces/message'

export class UnknownMessage implements Message {
  constructor(private readonly ctx: CustomContext) {}

  public build() {
    return this.ctx.t('unknown_message')
  }
}

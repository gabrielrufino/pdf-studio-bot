import type { Message } from '../interfaces/message'

export class UnknownMessage implements Message {
  public build() {
    return "⚠️ I'm sorry, I didn't understand that. Please check the available commands below:"
  }
}

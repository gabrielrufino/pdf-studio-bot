import type { User as TelegramUser } from 'grammy/types'

import { BaseEntity } from './base.entity'

export class MessageEntity extends BaseEntity {
  constructor(input?: Partial<MessageEntity>) {
    super()
    this.assign(input)
  }

  telegram_user!: TelegramUser

  text: string = ''
}

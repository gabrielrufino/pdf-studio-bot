import type { User as TelegramUser } from 'grammy/types'
import type { ObjectId } from 'mongodb'

export class MessageEntity {
  constructor(input: Partial<MessageEntity>) {
    Object.assign(this, input)
  }

  _id!: ObjectId

  telegram_user!: TelegramUser

  text: string = ''

  created_at: Date = new Date()

  updated_at: Date = new Date()
}

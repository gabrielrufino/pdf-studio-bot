import type { User as TelegramUser } from 'grammy/types'
import type { ObjectId } from 'mongodb'

export class UserEntity {
  constructor(input: Partial<UserEntity>) {
    Object.assign(this, input)
  }

  _id!: ObjectId

  telegram_user: TelegramUser | null = null

  is_blocked: boolean = false

  created_at: Date = new Date()

  updated_at: Date = new Date()
}

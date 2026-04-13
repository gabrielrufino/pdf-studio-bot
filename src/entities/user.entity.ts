import type { User as TelegramUser } from 'grammy/types'
import type { ObjectId } from 'mongodb'
import { PlanTypeEnum } from '../enums/plan-type.enum'

export class UserEntity {
  constructor(input: Partial<UserEntity>) {
    Object.assign(this, input)
  }

  _id!: ObjectId

  telegram_user: TelegramUser | null = null

  is_blocked: boolean = false

  plan_type?: PlanTypeEnum = PlanTypeEnum.Free

  plan_started_at?: Date = new Date()

  created_at: Date = new Date()

  updated_at: Date = new Date()
}

import type { ObjectId } from '@mikro-orm/mongodb'
import type { User as TelegramUser } from 'grammy/types'
import { Entity, PrimaryKey, Property, SerializedPrimaryKey } from '@mikro-orm/core'

@Entity()
export class UserEntity {
  @PrimaryKey()
  _id!: ObjectId

  @SerializedPrimaryKey()
  id!: string

  @Property({ nullable: true })
  telegram_user: TelegramUser | null = null
}

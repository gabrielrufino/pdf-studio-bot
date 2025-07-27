import type { MessageEntity } from '../entities/message.entity'
import { database } from '../config/database'
import { BaseRepository } from './base.repository'

export class MessageRepository extends BaseRepository<MessageEntity> {
  constructor() {
    super({
      collectionName: 'messages',
      database,
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['telegram_user', 'text', 'created_at'],
          properties: {
            telegram_user: {
              bsonType: 'object',
            },
            text: {
              bsonType: 'string',
            },
            created_at: {
              bsonType: 'date',
            },
          } as Record<keyof MessageEntity, any>,
        },
      },
    })
  }
}

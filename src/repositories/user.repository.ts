import type { UserEntity } from '../entities/user.entity'
import { database } from '../config/database'
import { BaseRepository } from './base.repository'

export class UserRepository extends BaseRepository<UserEntity> {
  constructor() {
    super({
      collectionName: 'users',
      database,
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['telegram_user', 'is_blocked', 'created_at', 'updated_at'],
          properties: {
            telegram_user: {
              bsonType: 'object',
            },
            is_blocked: {
              bsonType: 'bool',
            },
            created_at: {
              bsonType: 'date',
            },
            updated_at: {
              bsonType: 'date',
            },
          },
        },
      },
      indexes: ['telegram_user.id'],
    })
  }

  public async findByTelegramId(telegramId: number): Promise<UserEntity | null> {
    await this.ensureInitialized()

    return this.collection.findOne({ 'telegram_user.id': telegramId })
  }
}

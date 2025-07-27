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
          required: ['telegram_user', 'created_at'],
          properties: {
            telegram_user: {
              bsonType: 'object',
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
    })
  }

  async upsert(user: UserEntity): Promise<UserEntity> {
    const result = await this.collection.updateOne(
      { 'telegram_user.id': user.telegram_user?.id },
      {
        $set: {
          ...user,
          updated_at: new Date(),
        },
      },
      { upsert: true },
    )

    if (result.upsertedId) {
      return { ...user, _id: result.upsertedId } as UserEntity
    }

    const updatedUser = await this.collection.findOne({ 'telegram_user.id': user.telegram_user?.id })
    return updatedUser as UserEntity
  }
}

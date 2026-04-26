import type { Db } from 'mongodb'
import { EnsureInitialized } from '../decorators/ensure-initialized.decorator'
import { UserEntity } from '../entities/user.entity'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { BaseRepository } from './base.repository'

export class UserRepository extends BaseRepository<UserEntity> {
  constructor(database: Db) {
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
            plan_type: {
              bsonType: 'string',
              enum: Object.values(PlanTypeEnum),
            },
            plan_started_at: {
              bsonType: 'date',
            },
            daily_usage_count: {
              bsonType: 'number',
            },
            last_usage_date: {
              bsonType: ['string', 'null'],
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

  @EnsureInitialized
  public async findByTelegramId(telegramId: number): Promise<UserEntity | null> {
    const result = await this.collection.findOne({ 'telegram_user.id': telegramId })
    return result ? new UserEntity(result as any) : null
  }

  @EnsureInitialized
  public async incrementUsage(telegramId: number, limit: number): Promise<UserEntity | null> {
    const today = new Date().toISOString().split('T')[0]

    const result = await this.collection.findOneAndUpdate(
      {
        'telegram_user.id': telegramId,
        '$or': [
          { last_usage_date: { $ne: today } },
          {
            $and: [
              { last_usage_date: today },
              { daily_usage_count: { $lt: limit } },
            ],
          },
        ],
      },
      [
        {
          $set: {
            daily_usage_count: {
              $cond: {
                if: { $ne: ['$last_usage_date', today] },
                then: 1,
                else: { $add: ['$daily_usage_count', 1] },
              },
            },
            last_usage_date: today,
            updated_at: new Date(),
          },
        },
      ],
      { returnDocument: 'after' },
    )

    return result ? new UserEntity(result as any) : null
  }
}

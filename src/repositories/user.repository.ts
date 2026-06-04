import type { Db } from 'mongodb'
import { EnsureInitialized } from '../decorators/ensure-initialized.decorator'
import { UserEntity } from '../entities/user.entity'
import { LanguageEnum } from '../enums/language.enum'
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
              bsonType: ['date', 'null'],
            },
            daily_usage_count: {
              bsonType: 'int',
            },
            last_usage_date: {
              bsonType: ['string', 'null'],
            },
            last_reengagement_at: {
              bsonType: ['date', 'null'],
            },
            language: {
              bsonType: 'string',
              enum: Object.values(LanguageEnum),
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
  public async findInactiveUsers(days: number): Promise<UserEntity[]> {
    const date = new Date()
    date.setDate(date.getDate() - days)

    const result = await this.collection.find({
      updated_at: { $lt: date },
      is_blocked: false,
      $or: [
        { last_reengagement_at: null },
        { last_reengagement_at: { $lt: date } },
      ],
    }).toArray()

    return result.map(user => new UserEntity(user as any))
  }

  @EnsureInitialized
  public async isWithinLimit(telegramId: number, limit: number): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0]

    const user = await this.collection.findOne({
      'telegram_user.id': telegramId,
    })

    if (!user || user.is_blocked) {
      return !user
    }

    if (user.last_usage_date !== today) {
      return true
    }

    return (user.daily_usage_count || 0) < limit
  }

  @EnsureInitialized
  public async incrementUsage(telegramId: number, limit?: number): Promise<UserEntity | null> {
    const today = new Date().toISOString().split('T')[0]

    const filter: any = { 'telegram_user.id': telegramId, 'is_blocked': false }

    if (limit !== undefined) {
      filter.$or = [
        { last_usage_date: { $ne: today } },
        {
          $and: [
            { last_usage_date: today },
            { daily_usage_count: { $lt: limit } },
          ],
        },
      ]
    }

    const result = await this.collection.findOneAndUpdate(
      filter,
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

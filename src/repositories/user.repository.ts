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

  public async findInactiveUsers(days: number): Promise<any> {
    if (!this.initialized) {
      await this.init()
    }
    const startWindow = new Date()
    startWindow.setDate(startWindow.getDate() - days - 7) // 37 days ago

    const endWindow = new Date()
    endWindow.setDate(endWindow.getDate() - days) // 30 days ago

    const cursor = this.collection.aggregate([
      {
        $match: {
          is_blocked: false,
        },
      },
      {
        $lookup: {
          from: 'messages',
          let: { userId: '$telegram_user.id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$telegram_user.id', '$$userId'] },
              },
            },
            { $sort: { created_at: -1 } },
            { $limit: 1 },
          ],
          as: 'last_message',
        },
      },
      { $unwind: { path: '$last_message', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            // No messages, registration in window
            {
              last_message: { $exists: false },
              created_at: { $gte: startWindow, $lt: endWindow },
            },
            // Last message in window
            {
              'last_message.created_at': { $gte: startWindow, $lt: endWindow },
            },
          ],
        },
      },
    ])

    return {
      async *[Symbol.asyncIterator]() {
        for await (const user of cursor) {
          yield new UserEntity(user as any)
        }
      },
      async toArray() {
        const users = await cursor.toArray()
        return users.map(user => new UserEntity(user as any))
      },
    }
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

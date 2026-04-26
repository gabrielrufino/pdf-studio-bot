import { MongoClient, ObjectId } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { UserEntity } from '../entities/user.entity'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { UserRepository } from './user.repository'

describe(UserRepository.name, () => {
  let userRepository: UserRepository
  let mongod: MongoMemoryServer

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()

    process.env.MONGODB_CONNECTION_STRING = mongod.getUri()
    const database = new MongoClient(mongod.getUri()).db('pdf_studio_test')

    userRepository = new UserRepository(database)
  })

  afterAll(async () => {
    await mongod!.stop()
  })

  it('should create a user', async () => {
    const returned = await userRepository.create(new UserEntity({
      telegram_user: { id: 1, is_bot: false, first_name: 'Test' },
    }))

    expect(returned).toEqual({
      _id: expect.any(ObjectId),
      telegram_user: { id: 1, is_bot: false, first_name: 'Test' },
      is_blocked: false,
      plan_type: PlanTypeEnum.Free,
      plan_started_at: expect.any(Date),
      daily_usage_count: 0,
      last_usage_date: undefined,
      created_at: expect.any(Date),
      updated_at: expect.any(Date),
    })
  })

  describe(UserRepository.prototype.findByTelegramId.name, () => {
    it('should find a user by telegram id', async () => {
      await userRepository.create(new UserEntity({
        telegram_user: { id: 2, is_bot: false, first_name: 'Second' },
      }))
      await userRepository.create(new UserEntity({
        telegram_user: { id: 3, is_bot: false, first_name: 'Third' },
      }))

      const user = await userRepository.findByTelegramId(2)

      expect(user).toBeDefined()
      expect(user?.telegram_user?.id).toBe(2)
      expect(user?.telegram_user?.first_name).toBe('Second')
    })

    it('should return null if user is not found', async () => {
      const user = await userRepository.findByTelegramId(999)

      expect(user).toBeNull()
    })
  })
  describe('mongoDB Schema and Indexes', () => {
    it('should validate collection schema', async () => {
      await userRepository.create(new UserEntity({
        telegram_user: { id: 10, is_bot: false, first_name: 'Test' },
      })) // Ensure collection is initialized

      const db = new MongoClient(process.env.MONGODB_CONNECTION_STRING!).db('pdf_studio_test')
      const collection = db.collection('users')

      await expect(collection.insertOne({ telegram_user: { id: 1 }, is_blocked: 'string', created_at: new Date(), updated_at: new Date() })).rejects.toThrow()
      await expect(collection.insertOne({ telegram_user: { id: 1 }, is_blocked: false, plan_type: 'invalid', created_at: new Date(), updated_at: new Date() })).rejects.toThrow()
      await expect(collection.insertOne({ telegram_user: { id: 1 }, is_blocked: false, plan_started_at: 'string', created_at: new Date(), updated_at: new Date() })).rejects.toThrow()
      await expect(collection.insertOne({ telegram_user: { id: 1 }, is_blocked: false, created_at: 'string', updated_at: new Date() })).rejects.toThrow()
      await expect(collection.insertOne({ telegram_user: { id: 1 }, is_blocked: false, created_at: new Date(), updated_at: 'string' })).rejects.toThrow()
    })

    it('should create the correct indexes', async () => {
      await userRepository.create(new UserEntity({
        telegram_user: { id: 11, is_bot: false, first_name: 'Test' },
      }))

      const db = new MongoClient(process.env.MONGODB_CONNECTION_STRING!).db('pdf_studio_test')
      const indexes = await db.collection('users').indexes()

      expect(indexes.some(idx => idx.key['telegram_user.id'] === 1)).toBe(true)
    })
  })

  describe(UserRepository.prototype.incrementUsage.name, () => {
    it('should increment usage for an existing user', async () => {
      await userRepository.create(new UserEntity({
        telegram_user: { id: 20, is_bot: false, first_name: 'Test' },
      }))

      const user = await userRepository.incrementUsage(20, 3)

      expect(user).toBeDefined()
      expect(user?.daily_usage_count).toBe(1)
      expect(user?.last_usage_date).toBe(new Date().toISOString().split('T')[0])
    })

    it('should reset usage if it is a new day', async () => {
      await userRepository.create(new UserEntity({
        telegram_user: { id: 21, is_bot: false, first_name: 'Test' },
        daily_usage_count: 3,
        last_usage_date: '2000-01-01',
      }))

      const user = await userRepository.incrementUsage(21, 3)

      expect(user).toBeDefined()
      expect(user?.daily_usage_count).toBe(1)
      expect(user?.last_usage_date).toBe(new Date().toISOString().split('T')[0])
    })

    it('should return null if limit is reached', async () => {
      await userRepository.create(new UserEntity({
        telegram_user: { id: 22, is_bot: false, first_name: 'Test' },
        daily_usage_count: 3,
        last_usage_date: new Date().toISOString().split('T')[0],
      }))

      const user = await userRepository.incrementUsage(22, 3)

      expect(user).toBeNull()
    })

    it('should return null if user does not exist', async () => {
      const user = await userRepository.incrementUsage(9999, 3)

      expect(user).toBeNull()
    })
  })
})

import { MongoClient, ObjectId } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { UserEntity } from '../entities/user.entity'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { UserRepository } from './user.repository'

describe(UserRepository.name, () => {
  let userRepository: UserRepository
  let mongod: MongoMemoryServer
  let client: MongoClient

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()

    process.env.MONGODB_CONNECTION_STRING = mongod.getUri()
    client = new MongoClient(mongod.getUri())
    const database = client.db('pdf_studio_test')

    userRepository = new UserRepository(database)
  })

  afterAll(async () => {
    await client.close()
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
      language: 'en',
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

      const db = client.db('pdf_studio_test')
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

      const db = client.db('pdf_studio_test')
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

    it('should increment without limit check if limit is not provided', async () => {
      await userRepository.create(new UserEntity({
        telegram_user: { id: 30, is_bot: false, first_name: 'Test' },
        daily_usage_count: 5,
        last_usage_date: new Date().toISOString().split('T')[0],
      }))

      const user = await userRepository.incrementUsage(30)

      expect(user).toBeDefined()
      expect(user?.daily_usage_count).toBe(6)
    })
  })

  describe(UserRepository.prototype.isWithinLimit.name, () => {
    it('should return true if user does not exist', async () => {
      const isWithin = await userRepository.isWithinLimit(8888, 3)
      expect(isWithin).toBe(true)
    })

    it('should return true if it is a new day', async () => {
      await userRepository.create(new UserEntity({
        telegram_user: { id: 40, is_bot: false, first_name: 'Test' },
        daily_usage_count: 5,
        last_usage_date: '2000-01-01',
      }))

      const isWithin = await userRepository.isWithinLimit(40, 3)
      expect(isWithin).toBe(true)
    })

    it('should return true if within limit', async () => {
      await userRepository.create(new UserEntity({
        telegram_user: { id: 41, is_bot: false, first_name: 'Test' },
        daily_usage_count: 2,
        last_usage_date: new Date().toISOString().split('T')[0],
      }))

      const isWithin = await userRepository.isWithinLimit(41, 3)
      expect(isWithin).toBe(true)
    })

    it('should return false if limit reached', async () => {
      await userRepository.create(new UserEntity({
        telegram_user: { id: 42, is_bot: false, first_name: 'Test' },
        daily_usage_count: 3,
        last_usage_date: new Date().toISOString().split('T')[0],
      }))

      const isWithin = await userRepository.isWithinLimit(42, 3)
      expect(isWithin).toBe(false)
    })
  })

  describe('findInactiveUsers', () => {
    beforeEach(async () => {
      const db = client.db('pdf_studio_test')
      await db.collection('users').deleteMany({})
      await db.collection('messages').deleteMany({})
    })

    it('should return inactive users', async () => {
      const db = client.db('pdf_studio_test')
      const messagesCollection = db.collection('messages')

      await userRepository.create(new UserEntity({
        telegram_user: { id: 101, is_bot: false, first_name: 'Inactive' } as any,
      }))
      await userRepository.create(new UserEntity({
        telegram_user: { id: 102, is_bot: false, first_name: 'Active' } as any,
      }))

      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 35)

      // User 1 last message was 35 days ago
      await messagesCollection.insertOne({
        telegram_user: { id: 101 },
        text: 'hello',
        from_bot: false,
        is_reengagement: false,
        created_at: oldDate,
        updated_at: oldDate,
      })

      // User 2 last message was today
      await messagesCollection.insertOne({
        telegram_user: { id: 102 },
        text: 'hi',
        from_bot: false,
        is_reengagement: false,
        created_at: new Date(),
        updated_at: new Date(),
      })

      const cursor = await userRepository.findInactiveUsers(30)
      const inactiveUsers = await cursor.toArray()

      expect(inactiveUsers).toHaveLength(1)
      expect(inactiveUsers[0].telegram_user?.id).toBe(101)
    })

    it('should return inactive user even if bot sent a non-reengagement message recently', async () => {
      const db = client.db('pdf_studio_test')
      const messagesCollection = db.collection('messages')

      await userRepository.create(new UserEntity({
        telegram_user: { id: 104, is_bot: false, first_name: 'Bot Replied' } as any,
      }))

      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 35)

      // User 104 last message was 35 days ago
      await messagesCollection.insertOne({
        telegram_user: { id: 104 },
        text: 'hello',
        from_bot: false,
        is_reengagement: false,
        created_at: oldDate,
        updated_at: oldDate,
      })

      // Bot replied today (standard reply, not re-engagement)
      await messagesCollection.insertOne({
        telegram_user: { id: 104 },
        text: 'how can I help?',
        from_bot: true,
        is_reengagement: false,
        created_at: new Date(),
        updated_at: new Date(),
      })

      const cursor = await userRepository.findInactiveUsers(30)
      const inactiveUsers = await cursor.toArray()

      expect(inactiveUsers).toHaveLength(1)
      expect(inactiveUsers[0].telegram_user?.id).toBe(104)
    })

    it('should not return users who received re-engagement message recently', async () => {
      const db = client.db('pdf_studio_test')
      const messagesCollection = db.collection('messages')

      await userRepository.create(new UserEntity({
        telegram_user: { id: 103, is_bot: false, first_name: 'Already Invited' } as any,
      }))

      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 35)

      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 5)

      // User 103 last interaction was 35 days ago
      await messagesCollection.insertOne({
        telegram_user: { id: 103 },
        text: 'hello',
        from_bot: false,
        is_reengagement: false,
        created_at: oldDate,
        updated_at: oldDate,
      })

      // But received re-engagement 5 days ago
      await messagesCollection.insertOne({
        telegram_user: { id: 103 },
        text: 'miss you',
        from_bot: true,
        is_reengagement: true,
        created_at: recentDate,
        updated_at: recentDate,
      })

      const cursor = await userRepository.findInactiveUsers(30)
      const inactiveUsers = await cursor.toArray()

      expect(inactiveUsers).toHaveLength(0)
    })

    it('should not return new users who have no messages', async () => {
      await userRepository.create(new UserEntity({
        telegram_user: { id: 105, is_bot: false, first_name: 'New User' } as any,
      }))

      // No messages for User 105, and created_at is today

      const cursor = await userRepository.findInactiveUsers(30)
      const inactiveUsers = await cursor.toArray()

      expect(inactiveUsers).toHaveLength(0)
    })

    it('should return old users who have no messages', async () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 35)

      await userRepository.create(new UserEntity({
        telegram_user: { id: 106, is_bot: false, first_name: 'Old User' } as any,
        created_at: oldDate,
      }))

      const cursor = await userRepository.findInactiveUsers(30)
      const inactiveUsers = await cursor.toArray()

      expect(inactiveUsers).toHaveLength(1)
      expect(inactiveUsers[0].telegram_user?.id).toBe(106)
    })
  })
})

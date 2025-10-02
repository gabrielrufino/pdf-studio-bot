import type { UserRepository } from './user.repository'
import { ObjectId } from 'mongodb'

import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { UserEntity } from '../entities/user.entity'

describe('userRepository', () => {
  let userRepository: UserRepository
  let mongod: MongoMemoryServer

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()

    process.env.MONGODB_CONNECTION_STRING = mongod.getUri()

    userRepository = await import('./user.repository').then(m => new m.UserRepository())
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
      created_at: expect.any(Date),
      updated_at: expect.any(Date),
    })
  })
})

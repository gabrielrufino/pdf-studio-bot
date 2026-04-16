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
      created_at: expect.any(Date),
      updated_at: expect.any(Date),
    })
  })
})

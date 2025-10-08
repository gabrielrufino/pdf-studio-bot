import type { FeedbackRepository } from './feedback.repository'

import { ObjectId } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { FeedbackEntity } from '../entities/feedback.entity'

describe('feedbackRepository', () => {
  let feedbackRepository: FeedbackRepository
  let mongod: MongoMemoryServer

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()

    process.env.MONGODB_CONNECTION_STRING = mongod.getUri()

    feedbackRepository = await import('./feedback.repository').then(m => new m.FeedbackRepository())
  })

  afterAll(async () => {
    await mongod!.stop()
  })

  it('should create a feedback', async () => {
    const returned = await feedbackRepository.create(new FeedbackEntity({
      telegram_user: { id: 1, is_bot: false, first_name: 'Test' },
      text: 'Hello, world!',
    }))

    expect(returned).toEqual({
      _id: expect.any(ObjectId),
      telegram_user: { id: 1, is_bot: false, first_name: 'Test' },
      text: 'Hello, world!',
      created_at: expect.any(Date),
      updated_at: expect.any(Date),
    })
  })
})

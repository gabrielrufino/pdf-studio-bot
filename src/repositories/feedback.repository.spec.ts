import { MongoClient, ObjectId } from 'mongodb'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { FeedbackEntity } from '../entities/feedback.entity'
import { FeedbackRepository } from './feedback.repository'

describe(FeedbackRepository.name, () => {
  let feedbackRepository: FeedbackRepository
  let client: MongoClient

  beforeAll(async () => {
    const uri = process.env.__MONGODB_URI__!
    client = new MongoClient(uri)
    await client.connect()

    const database = client.db('pdf_studio_test')

    feedbackRepository = new FeedbackRepository(database)
  })

  afterAll(async () => {
    await client.close()
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

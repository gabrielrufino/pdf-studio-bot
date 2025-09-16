import type { MessageRepository } from './message.repository'
import { ObjectId } from 'mongodb'

import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MessageEntity } from '../entities/message.entity'

describe('messageRepository', () => {
  let messageRepository: MessageRepository
  let mongod: MongoMemoryServer

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()

    process.env.MONGODB_CONNECTION_STRING = mongod.getUri()

    messageRepository = await import('./message.repository').then(m => new m.MessageRepository())
  })

  afterAll(async () => {
    await mongod!.stop()
  })

  it('should create a message', async () => {
    const returned = await messageRepository.create(new MessageEntity({
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

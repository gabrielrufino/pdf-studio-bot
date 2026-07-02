import { MongoClient } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ConfigurationEntity } from '../entities/configuration.entity'
import { ConfigurationRepository } from './configuration.repository'

describe(ConfigurationRepository.name, () => {
  let configurationRepository: ConfigurationRepository
  let mongod: MongoMemoryServer
  let client: MongoClient

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    client = new MongoClient(mongod.getUri())
    await client.connect()
    const database = client.db('pdf_studio_test')
    configurationRepository = new ConfigurationRepository(database)
    await configurationRepository.init()
  })

  afterAll(async () => {
    await client.close()
    await mongod.stop()
  })

  describe(ConfigurationRepository.prototype.findByKey.name, () => {
    it('should return null when key does not exist', async () => {
      const result = await configurationRepository.findByKey('non_existent_key')
      expect(result).toBeNull()
    })

    it('should return the configuration when key exists', async () => {
      await configurationRepository.create(new ConfigurationEntity({
        key: 'pro_stars_amount',
        value: '500',
      }))

      const result = await configurationRepository.findByKey('pro_stars_amount')

      expect(result).toMatchObject({
        key: 'pro_stars_amount',
        value: '500',
      })
    })
  })

  it('should create the correct indexes', async () => {
    const indexes = await client.db('pdf_studio_test').collection('configurations').indexes()
    expect(indexes.some(idx => idx.key.key === 1)).toBe(true)
  })

  it('should enforce schema — reject missing required fields', async () => {
    const db = client.db('pdf_studio_test')

    await expect(
      db.collection('configurations').insertOne({
        created_at: new Date(),
        updated_at: new Date(),
      } as any),
    ).rejects.toThrow()
  })
})

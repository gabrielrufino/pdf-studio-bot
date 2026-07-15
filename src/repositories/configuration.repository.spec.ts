import { MongoClient } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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

  describe(ConfigurationRepository.prototype.findGlobalConfig.name, () => {
    it('should return the global_config document after init', async () => {
      const result = await configurationRepository.findGlobalConfig()

      expect(result).toMatchObject({
        _id: 'global_config',
        pro_price: 350,
        maintenance_mode: false,
        maintenance_timeout_minutes: 30,
      })
    })

    it('should not create a duplicate document when init is called again', async () => {
      await configurationRepository.init()

      const docs = await client
        .db('pdf_studio_test')
        .collection('configurations')
        .find({ _id: 'global_config' } as any)
        .toArray()

      expect(docs).toHaveLength(1)
    })

    it('should migrate existing configuration missing maintenance fields', async () => {
      const db = client.db('pdf_studio_test')
      const coll = db.collection('configurations')

      // Remove the validator temporarily to insert an incomplete document
      await db.command({ collMod: 'configurations', validator: {} })

      await coll.deleteOne({ _id: 'global_config' } as any)
      await coll.insertOne({
        _id: 'global_config',
        pro_price: 400,
        created_at: new Date(),
        updated_at: new Date(),
      } as any)

      // Re-apply validator via init
      await configurationRepository.init()

      const result = await configurationRepository.findGlobalConfig()
      expect(result).toMatchObject({
        _id: 'global_config',
        pro_price: 400,
        maintenance_mode: false,
        maintenance_timeout_minutes: 30,
      })
    })
  })

  it('should enforce schema — reject document missing required fields', async () => {
    const db = client.db('pdf_studio_test')

    await expect(
      db.collection('configurations').insertOne({
        _id: 'bad_doc',
        created_at: new Date(),
        updated_at: new Date(),
      } as any),
    ).rejects.toThrow()
  })

  it('should enforce schema — reject pro_price <= 0', async () => {
    const db = client.db('pdf_studio_test')

    await expect(
      db.collection('configurations').insertOne({
        _id: 'bad_price_doc',
        pro_price: 0,
        created_at: new Date(),
        updated_at: new Date(),
      } as any),
    ).rejects.toThrow()
  })
})

import type { Db } from 'mongodb'
import type { ConfigurationEntity } from '../entities/configuration.entity'
import { EnsureInitialized } from '../decorators/ensure-initialized.decorator'
import { BaseRepository } from './base.repository'

const GLOBAL_CONFIG_ID = 'global_config' as const

export class ConfigurationRepository extends BaseRepository<ConfigurationEntity> {
  constructor(database: Db) {
    super({
      collectionName: 'configurations',
      database,
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['_id', 'pro_price', 'created_at', 'updated_at'],
          properties: {
            _id: {
              bsonType: 'string',
            },
            pro_price: {
              bsonType: 'number',
              minimum: 1,
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
    })
  }

  public async init(): Promise<void> {
    await super.init()
    await this.seed()
  }

  @EnsureInitialized
  public async findGlobalConfig(): Promise<ConfigurationEntity> {
    return this.collection.findOne({ _id: GLOBAL_CONFIG_ID })! as Promise<ConfigurationEntity>
  }

  private async seed(): Promise<void> {
    const exists = await this.collection.findOne({ _id: GLOBAL_CONFIG_ID } as any)
    if (!exists) {
      const now = new Date()
      await this.collection.insertOne({
        _id: GLOBAL_CONFIG_ID,
        pro_price: 350,
        created_at: now,
        updated_at: now,
      } as any)
    }
  }
}

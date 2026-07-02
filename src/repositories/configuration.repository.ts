import type { Db } from 'mongodb'
import type { ConfigurationEntity } from '../entities/configuration.entity'
import { BaseRepository } from './base.repository'

export class ConfigurationRepository extends BaseRepository<ConfigurationEntity> {
  constructor(database: Db) {
    super({
      collectionName: 'configurations',
      database,
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['key', 'value', 'created_at', 'updated_at'],
          properties: {
            key: {
              bsonType: 'string',
            },
            value: {
              bsonType: 'string',
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
      indexes: ['key'],
    })
  }

  public async findByKey(key: string): Promise<ConfigurationEntity | null> {
    return this.collection.findOne({ key } as any) as Promise<ConfigurationEntity | null>
  }
}

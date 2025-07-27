import type { Collection, CreateCollectionOptions, Db, Document } from 'mongodb'
import { database } from '../config/database'

export abstract class BaseRepository<T extends Document> {
  private readonly validator: CreateCollectionOptions['validator']

  protected readonly collection: Collection

  constructor(params: {
    collectionName: string
    database: Db
    validator: CreateCollectionOptions['validator']
  }) {
    this.collection = params.database.collection(params.collectionName)
    this.validator = params.validator
  }

  public async init(): Promise<void> {
    const collections = await database.listCollections({ name: this.collection.collectionName }).toArray()
    const collectionExists = collections.length > 0

    if (!collectionExists) {
      await database.createCollection(this.collection.collectionName)
    }

    await database.command({
      collMod: this.collection.collectionName,
      validator: this.validator,
    })
  }

  public async create(entity: T): Promise<T> {
    const result = await this.collection.insertOne(entity)
    return { ...entity, _id: result.insertedId }
  }
}

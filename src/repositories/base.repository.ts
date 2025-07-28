import type { Collection, CreateCollectionOptions, Db, Document, ObjectId } from 'mongodb'
import { database } from '../config/database'

export abstract class BaseRepository<T extends Document & { updated_at: Date }> {
  private readonly validator: CreateCollectionOptions['validator']
  private initialized = false

  protected readonly collection: Collection<T>

  constructor(params: {
    collectionName: string
    database: Db
    validator: CreateCollectionOptions['validator']
  }) {
    this.collection = params.database.collection(params.collectionName)
    this.validator = params.validator
  }

  protected async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init()
    }
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

    this.initialized = true
  }

  public async create(entity: T): Promise<T> {
    await this.ensureInitialized()

    const result = await this.collection.insertOne(entity as any)
    return { ...entity, _id: result.insertedId }
  }

  public async updateById(id: ObjectId, entity: Partial<T>): Promise<T | null> {
    await this.ensureInitialized()

    entity.updated_at = new Date()

    const result = await this.collection.findOneAndUpdate(
      { _id: id } as any,
      { $set: entity },
      { returnDocument: 'after' },
    )

    return result?.value
  }
}
